import { useEffect, useRef } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { FloorplanCanvas } from '@/ui/FloorplanCanvas'
import { Sidebar } from '@/ui/Sidebar'
import { updateProject, uploadFile } from '@/api/client'

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const setFloorplan = useProjectStore(s => s.setFloorplan)
  const exportProject = useProjectStore(s => s.exportProject)
  const importProject = useProjectStore(s => s.importProject)
  const initialize = useProjectStore(s => s.initialize)

  useEffect(() => {
    initialize('default')
  }, [])

  function onPickImage() {
    inputRef.current?.click()
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { url } = await uploadFile(file)
    await updateProject('default', { floorplanUrl: url })
    setFloorplan(url)
    e.target.value = ''
  }

  function onExport() {
    const data = exportProject()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'project.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function onImportClick() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      try { importProject(JSON.parse(text)) } catch {}
    }
    input.click()
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="title">食堂设备点位勘探</div>
        <button onClick={onPickImage}>导入平面图</button>
        <button onClick={onExport}>导出JSON</button>
        <button onClick={onImportClick}>导入JSON</button>
        <div className="spacer" />
        <span className="muted">提示：双指缩放，拖动平移，点按添加摄像头</span>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
      </div>
      <div className="content">
        <div className="sidebar"><Sidebar /></div>
        <div className="stage-wrap"><FloorplanCanvas /></div>
      </div>
    </div>
  )
}


