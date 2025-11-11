import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Image as KImage, Group, Wedge, Circle, Arrow, Text } from 'react-konva'
import type { Stage as KonvaStage } from 'konva/lib/Stage'
import useImage from 'use-image'
import { useProjectStore } from '@/store/useProjectStore'
import type { Camera } from '@/types'

export function FloorplanCanvas() {
  const { floorplanDataUrl, cameras, addCameraAt, updateCamera, selectCamera, selectedCameraId, statuses, analysisTypes } = useProjectStore()
  const [img] = useImage(floorplanDataUrl || '', 'anonymous')

  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<KonvaStage | null>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const pinchRef = useRef<{ dist: number; center: { x: number; y: number } } | null>(null)

  useEffect(() => {
    function fitAndCenter(image: HTMLImageElement, width: number, height: number) {
      if (!width || !height) return
      const scaleFit = Math.min(width / image.width, height / image.height)
      const displayWidth = image.width * scaleFit
      const displayHeight = image.height * scaleFit
      setScale(scaleFit)
      setPos({ x: (width - displayWidth) / 2, y: (height - displayHeight) / 2 })
    }

    if (img) {
      const el = containerRef.current
      if (!el) return
      fitAndCenter(img, el.clientWidth, el.clientHeight || 600)
    }
  }, [img, size.w, size.h])

  useEffect(() => {
    function onResize() {
      const el = containerRef.current
      if (!el) return
      setSize({ w: el.clientWidth, h: el.clientHeight || 600 })
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const stageDraggable = true

  function stageToScene(point: { x: number; y: number }) {
    return { x: (point.x - pos.x) / scale, y: (point.y - pos.y) / scale }
  }

  function clampPosition(next: { x: number; y: number }, nextScale: number) {
    if (!img) return next
    const imgWidth = img.width * nextScale
    const imgHeight = img.height * nextScale
    const containerWidth = size.w
    const containerHeight = size.h

    let x = next.x
    let y = next.y

    if (imgWidth <= containerWidth) {
      x = (containerWidth - imgWidth) / 2
    } else {
      const minX = containerWidth - imgWidth
      if (x < minX) x = minX
      if (x > 0) x = 0
    }

    if (imgHeight <= containerHeight) {
      y = (containerHeight - imgHeight) / 2
    } else {
      const minY = containerHeight - imgHeight
      if (y < minY) y = minY
      if (y > 0) y = 0
    }

    return { x, y }
  }

  function onStageClick(e: any) {
    const target = e.target
    const stage = target.getStage()
    if (!stage) return
    const isBackground = target === stage || target.name() === 'floorplan'
    if (!isBackground) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const p = stageToScene(pointer)
    addCameraAt(p.x, p.y)
  }

  function onWheel(e: any) {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    const oldScale = scale
    const pointer = stage.getPointerPosition()!
    const mousePointTo = { x: (pointer.x - pos.x) / oldScale, y: (pointer.y - pos.y) / oldScale }
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.max(0.2, Math.min(5, oldScale * (1 + direction * 0.1)))
    const unclampedPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale }
    const nextPos = clampPosition(unclampedPos, newScale)
    setScale(newScale)
    setPos(nextPos)
  }

  function getTouchCenter(touches: TouchList) {
    const p1 = { x: touches[0].clientX, y: touches[0].clientY }
    const p2 = { x: touches[1].clientX, y: touches[1].clientY }
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
  }

  function getTouchDist(touches: TouchList) {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.hypot(dx, dy)
  }

  function onTouchStart(e: any) {
    const t = e.evt.touches
    if (t.length === 2) {
      pinchRef.current = { dist: getTouchDist(t), center: getTouchCenter(t) }
    }
  }

  function onTouchMove(e: any) {
    const t = e.evt.touches
    if (t.length === 2 && pinchRef.current) {
      e.evt.preventDefault()
      const stage = e.target.getStage()
      const oldScale = scale
      const oldPos = pos
      const newDist = getTouchDist(t)
      const center = getTouchCenter(t)
      const scaleBy = newDist / pinchRef.current.dist
      const newScale = Math.max(0.2, Math.min(5, oldScale * scaleBy))
      const mousePointTo = { x: (center.x - oldPos.x) / oldScale, y: (center.y - oldPos.y) / oldScale }
      const newPos = { x: center.x - mousePointTo.x * newScale, y: center.y - mousePointTo.y * newScale }
      const clamped = clampPosition(newPos, newScale)
      setScale(newScale)
      setPos(clamped)
      pinchRef.current = { dist: newDist, center }
    }
  }

  function onTouchEnd() {
    pinchRef.current = null
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Stage
        ref={(node) => { stageRef.current = node }}
        width={size.w}
        height={size.h}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        x={pos.x}
        y={pos.y}
        scaleX={scale}
        scaleY={scale}
        draggable={stageDraggable && !!img}
        onDragMove={(e) => {
          const next = clampPosition({ x: e.target.x(), y: e.target.y() }, scale)
          stageRef.current?.position(next)
          setPos(next)
        }}
        onDragEnd={(e) => {
          const next = clampPosition({ x: e.target.x(), y: e.target.y() }, scale)
          stageRef.current?.position(next)
          setPos(next)
        }}
        onClick={onStageClick}
      >
        <Layer listening={false}>
          {!img && (
            <Text text="请从顶部导入平面图，然后点按添加摄像头" fill="#94a3b8" fontSize={18} x={24} y={24} />
          )}
        </Layer>
        <Layer>
          {img && <KImage image={img} width={img.width} height={img.height} name="floorplan" listening={false} />}
          {cameras.map(cam => (
            <CameraNode
              key={cam.id}
              selected={selectedCameraId === cam.id}
              camera={cam}
              onChange={(patch) => updateCamera(cam.id, patch)}
              onSelect={() => selectCamera(cam.id)}
            />
          ))}
        </Layer>
      </Stage>
      {cameras.map(cam => (
        selectedCameraId === cam.id ? (
          <CameraOverlay
            key={`overlay-${cam.id}`}
            camera={cam}
            selected
            stageScale={scale}
            stagePos={pos}
            statuses={statuses}
            analysisTypes={analysisTypes}
            onChange={(patch) => updateCamera(cam.id, patch)}
          />
        ) : null
      ))}
      <div className="stage-hint">双指缩放/拖拽移动；点击空白添加摄像头；拖拽扇形或箭头调整</div>
    </div>
  )
}

function CameraNode({ camera, onChange, onSelect, selected }: {
  camera: Camera
  onChange: (patch: Partial<Camera>) => void
  onSelect: () => void
  selected: boolean
}) {
  const wedgeDragging = useRef(false)
  const color = selected ? '#38bdf8' : '#22c55e'
  const { fovAngleDeg, fovRadius, rotationDeg } = camera
  const startAngle = rotationDeg - fovAngleDeg / 2
  const arrowLength = Math.max(40, Math.min(fovRadius * 0.8, 200))
  const rotationRad = rotationDeg * Math.PI / 180
  const labelDistance = fovRadius + 40
  const labelX = Math.cos(rotationRad) * labelDistance
  const labelY = Math.sin(rotationRad) * labelDistance
  const statusText = camera.status ? `状态：${camera.status}` : '状态：未选择'
  const analysesText = camera.analyses.length ? `AI：${camera.analyses.join('、')}` : 'AI：未选择'

  function stopPropagation(e: any, select = true) {
    e.cancelBubble = true
    if (select) {
      onSelect()
    }
  }

  function resetHandlePosition(node: any) {
    node.position({ x: 0, y: 0 })
  }

  function getLocalPointer(e: any) {
    const stage = e.target.getStage()
    if (!stage) return null
    const pointer = stage.getPointerPosition()
    if (!pointer) return null
    const transform = e.target.getParent().getAbsoluteTransform().copy()
    transform.invert()
    const pos = transform.point(pointer)
    return pos
  }

  function updateFromPointer(e: any) {
    const pos = getLocalPointer(e)
    if (!pos) return
    const { x, y } = pos
    const r = Math.sqrt(x * x + y * y)
    const deg = Math.atan2(y, x) * 180 / Math.PI
    const normalizedDeg = ((deg % 360) + 360) % 360
    const clampedRadius = Math.max(40, Math.min(1000, r))
    onChange({ rotationDeg: normalizedDeg, fovRadius: clampedRadius })
  }

  return (
    <Group
      x={camera.x}
      y={camera.y}
      draggable
      onDragMove={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
      onClick={stopPropagation}
      onTap={stopPropagation}
    >
      <Wedge
        x={0}
        y={0}
        angle={fovAngleDeg}
        radius={fovRadius}
        rotation={startAngle}
        fill={selected ? 'rgba(56,189,248,0.15)' : 'rgba(34,197,94,0.15)'}
        stroke={color}
        strokeWidth={1}
        listening={true}
        onMouseDown={(e) => {
          stopPropagation(e)
          wedgeDragging.current = true
          updateFromPointer(e)
        }}
        onMouseMove={(e) => {
          if (!wedgeDragging.current) return
          stopPropagation(e, false)
          updateFromPointer(e)
        }}
        onMouseUp={(e) => {
          stopPropagation(e, false)
          wedgeDragging.current = false
        }}
        onMouseLeave={() => {
          wedgeDragging.current = false
        }}
        onTouchStart={(e) => {
          stopPropagation(e)
          wedgeDragging.current = true
          updateFromPointer(e)
        }}
        onTouchMove={(e) => {
          if (!wedgeDragging.current) return
          e.evt.preventDefault()
          stopPropagation(e, false)
          updateFromPointer(e)
        }}
        onTouchEnd={(e) => {
          stopPropagation(e, false)
          wedgeDragging.current = false
        }}
        onTouchCancel={() => {
          wedgeDragging.current = false
        }}
      />
      <Arrow
        x={0}
        y={0}
        points={[0, 0, Math.cos(rotationDeg * Math.PI / 180) * arrowLength, Math.sin(rotationDeg * Math.PI / 180) * arrowLength]}
        pointerLength={8}
        pointerWidth={8}
        stroke={color}
        fill={color}
        strokeWidth={2}
        draggable
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        onDragMove={(e) => {
          const dx = e.target.x()
          const dy = e.target.y()
          const deg = Math.atan2(dy, dx) * 180 / Math.PI
          onChange({ rotationDeg: ((deg % 360) + 360) % 360 })
        }}
        onDragEnd={(e) => resetHandlePosition(e.target)}
      />
      <Circle
        x={0}
        y={0}
        radius={10}
        fill={color}
      />
      <Text x={12} y={-8} fontSize={14} fill="#e5e7eb" text={camera.name} />
      <Group x={labelX} y={labelY} listening={false}>
        <Circle radius={4} fill={selected ? '#38bdf8' : '#22c55e'} opacity={0.6} />
        <Text x={8} y={-6} fontSize={12} fill="#f1f5f9" text={`${statusText}\n${analysesText}`} lineHeight={1.2} />
      </Group>
      {/* 角度与半径手柄 */}
      <Circle x={Math.cos((startAngle + fovAngleDeg) * Math.PI/180) * fovRadius} y={Math.sin((startAngle + fovAngleDeg) * Math.PI/180) * fovRadius} radius={6} fill="#f59e0b" draggable
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        onDragMove={(e) => {
          const dx = e.target.x()
          const dy = e.target.y()
          const r = Math.sqrt(dx*dx + dy*dy)
          const deg = Math.atan2(dy, dx) * 180 / Math.PI
          const newAngle = ((deg - (rotationDeg - fovAngleDeg/2)) + 360) % 360
          const clampedRadius = Math.max(40, Math.min(1000, r))
          const clampedAngle = Math.max(10, Math.min(180, newAngle))
          onChange({ fovRadius: clampedRadius, fovAngleDeg: clampedAngle })
        }}
        onDragEnd={(e) => resetHandlePosition(e.target)}
      />
    </Group>
  )
}

function CameraOverlay({
  camera,
  selected,
  stageScale,
  stagePos,
  statuses,
  analysisTypes,
  onChange
}: {
  camera: Pick<Camera, 'id' | 'x' | 'y' | 'status' | 'analyses' | 'rotationDeg' | 'fovRadius'>
  selected: boolean
  stageScale: number
  stagePos: { x: number; y: number }
  statuses: string[]
  analysisTypes: string[]
  onChange: (patch: Partial<Camera>) => void
}) {
  const anchor = getOverlayAnchor(camera)
  const left = stagePos.x + anchor.x * stageScale
  const top = stagePos.y + anchor.y * stageScale

  const summaryStatus = camera.status ?? '未选择'
  const summaryAnalyses = camera.analyses.length ? camera.analyses.join('、') : '未选择'

  return (
    <div
      className={"camera-overlay" + (selected ? ' selected' : '')}
      style={{ left: left, top: top }}
    >
      <div className="camera-overlay-summary">
        <div><strong>状态：</strong>{summaryStatus}</div>
        <div><strong>AI：</strong>{summaryAnalyses}</div>
      </div>
      {selected && (
        <div className="camera-overlay-controls">
          <label>
            <span>状态</span>
            <select value={camera.status ?? ''} onChange={(e) => onChange({ status: e.target.value || null })}>
              <option value="">未选择</option>
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="overlay-checkboxes">
            <span>AI分析</span>
            {analysisTypes.map(a => {
              const active = camera.analyses.includes(a)
              return (
                <label key={a}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => {
                      const next = active ? camera.analyses.filter(x => x !== a) : [...camera.analyses, a]
                      onChange({ analyses: next })
                    }}
                  />
                  {a}
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function getOverlayAnchor(cam: Pick<Camera, 'x' | 'y' | 'rotationDeg' | 'fovRadius'>) {
  const theta = cam.rotationDeg * Math.PI / 180
  const dist = cam.fovRadius + 60
  return { x: cam.x + Math.cos(theta) * dist, y: cam.y + Math.sin(theta) * dist }
}


