import { useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Image as KImage, Group, Wedge, Circle, Arrow, Text } from 'react-konva'
import useImage from 'use-image'
import { useProjectStore } from '@/store/useProjectStore'

export function FloorplanCanvas() {
  const { floorplanDataUrl, cameras, addCameraAt, updateCamera, selectCamera, selectedCameraId } = useProjectStore()
  const [img] = useImage(floorplanDataUrl || '')

  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const pinchRef = useRef<{ dist: number; center: { x: number; y: number } } | null>(null)

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

  useEffect(() => {
    if (img) {
      const el = containerRef.current
      if (!el) return
      const scaleFit = Math.min(el.clientWidth / img.width, (el.clientHeight || 600) / img.height)
      setScale(scaleFit)
      setPos({ x: (el.clientWidth - img.width * scaleFit) / 2, y: ((el.clientHeight || 600) - img.height * scaleFit) / 2 })
    }
  }, [img])

  const stageDraggable = true

  function stageToScene(point: { x: number; y: number }) {
    return { x: (point.x - pos.x) / scale, y: (point.y - pos.y) / scale }
  }

  function onStageClick(e: any) {
    const target = e.target
    if (target === e.target.getStage()) {
      const p = stageToScene(e.target.getPointerPosition())
      addCameraAt(p.x, p.y)
    }
  }

  function onWheel(e: any) {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    const oldScale = scale
    const pointer = stage.getPointerPosition()!
    const mousePointTo = { x: (pointer.x - pos.x) / oldScale, y: (pointer.y - pos.y) / oldScale }
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.max(0.2, Math.min(5, oldScale * (1 + direction * 0.1)))
    const newPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale }
    setScale(newScale)
    setPos(newPos)
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
      setScale(newScale)
      setPos(newPos)
      pinchRef.current = { dist: newDist, center }
    }
  }

  function onTouchEnd() {
    pinchRef.current = null
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Stage
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
        draggable={stageDraggable}
        onDragEnd={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
        onClick={onStageClick}
      >
        <Layer listening={!img}>
          {!img && (
            <Text text="请从顶部导入平面图，然后点按添加摄像头" fill="#94a3b8" fontSize={18} x={24} y={24} />
          )}
        </Layer>
        <Layer>
          {img && <KImage image={img} width={img.width} height={img.height} />}
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
      <div className="stage-hint">双指缩放/拖拽移动；点击空白添加摄像头；拖拽扇形或箭头调整</div>
    </div>
  )
}

function CameraNode({ camera, onChange, onSelect, selected }: {
  camera: { id: string; name: string; x: number; y: number; rotationDeg: number; fovAngleDeg: number; fovRadius: number; status: string | null; analyses: string[] }
  onChange: (patch: Partial<typeof camera>) => void
  onSelect: () => void
  selected: boolean
}) {
  const color = selected ? '#38bdf8' : '#22c55e'
  const { fovAngleDeg, fovRadius, rotationDeg } = camera
  const startAngle = rotationDeg - fovAngleDeg / 2
  return (
    <Group x={camera.x} y={camera.y} onClick={onSelect}>
      <Wedge x={0} y={0} angle={fovAngleDeg} radius={fovRadius} rotation={startAngle} fill={selected ? 'rgba(56,189,248,0.15)' : 'rgba(34,197,94,0.15)'} stroke={color} strokeWidth={1} listening={true}
        draggable
        onDragMove={(e) => onChange({ x: e.target.x() + camera.x, y: e.target.y() + camera.y })}
        onDragEnd={(e) => onChange({ x: e.target.x() + camera.x, y: e.target.y() + camera.y })}
      />
      <Arrow points={[0,0, Math.cos(rotationDeg * Math.PI/180) * (fovRadius*0.8), Math.sin(rotationDeg * Math.PI/180) * (fovRadius*0.8)]} pointerLength={8} pointerWidth={8} stroke={color} fill={color} strokeWidth={2}
        draggable
        onDragMove={(e) => {
          const dx = e.target.x()
          const dy = e.target.y()
          const deg = Math.atan2(dy, dx) * 180 / Math.PI
          onChange({ rotationDeg: ((deg % 360) + 360) % 360 })
        }}
      />
      <Circle x={0} y={0} radius={10} fill={color} draggable
        onDragMove={(e) => onChange({ x: camera.x + e.target.x(), y: camera.y + e.target.y() })}
        onDragEnd={(e) => onChange({ x: camera.x + e.target.x(), y: camera.y + e.target.y() })}
      />
      <Text x={12} y={-8} fontSize={14} fill="#e5e7eb" text={camera.name} />
      {/* 角度与半径手柄 */}
      <Circle x={Math.cos((startAngle + fovAngleDeg) * Math.PI/180) * fovRadius} y={Math.sin((startAngle + fovAngleDeg) * Math.PI/180) * fovRadius} radius={6} fill="#f59e0b" draggable
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
      />
    </Group>
  )
}


