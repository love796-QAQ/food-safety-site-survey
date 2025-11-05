import { useMemo, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'

export function Sidebar() {
  const { cameras, selectedCameraId, updateCamera, removeCamera, selectCamera, statuses, analysisTypes, setStatuses, setAnalysisTypes } = useProjectStore()
  const selected = useMemo(() => cameras.find(c => c.id === selectedCameraId) || null, [cameras, selectedCameraId])

  return (
    <div>
      <div className="group">
        <h3>摄像头列表</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cameras.map(c => (
            <button key={c.id} onClick={() => selectCamera(c.id)} style={{ textAlign: 'left', background: selectedCameraId === c.id ? '#0b2a3a' : '#0b1220', borderColor: selectedCameraId === c.id ? '#38bdf8' : '#334155' }}>{c.name}</button>
          ))}
          {cameras.length === 0 && <div className="muted">暂无摄像头，点击画布空白处添加</div>}
        </div>
      </div>

      <div className="group">
        <h3>属性</h3>
        {!selected && <div className="muted">请选择一个摄像头</div>}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label>
              <div>名称</div>
              <input value={selected.name} onChange={e => updateCamera(selected.id, { name: e.target.value })} />
            </label>
            <div className="row">
              <label>
                <div>状态</div>
                <select value={selected.status ?? ''} onChange={e => updateCamera(selected.id, { status: e.target.value })}>
                  <option value="">未选择</option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <div>
              <div>AI分析类型（可多选）</div>
              <div className="chips">
                {analysisTypes.map(a => {
                  const active = selected.analyses.includes(a)
                  return (
                    <div key={a} className={"chip" + (active ? ' active' : '')} onClick={() => {
                      const next = active ? selected.analyses.filter(x => x !== a) : [...selected.analyses, a]
                      updateCamera(selected.id, { analyses: next })
                    }}>{a}</div>
                  )
                })}
              </div>
            </div>

            <div className="row">
              <label>
                <div>方向(°)</div>
                <input type="number" value={Math.round(selected.rotationDeg)} onChange={e => updateCamera(selected.id, { rotationDeg: Number(e.target.value) })} />
              </label>
              <label>
                <div>扇形角度(°)</div>
                <input type="number" value={Math.round(selected.fovAngleDeg)} onChange={e => updateCamera(selected.id, { fovAngleDeg: Number(e.target.value) })} />
              </label>
            </div>
            <label>
              <div>覆盖半径(px)</div>
              <input type="number" value={Math.round(selected.fovRadius)} onChange={e => updateCamera(selected.id, { fovRadius: Number(e.target.value) })} />
            </label>

            <div className="row">
              <button className="danger" onClick={() => removeCamera(selected.id)}>删除</button>
            </div>
          </div>
        )}
      </div>

      <ConfigPanel statuses={statuses} analysisTypes={analysisTypes} onStatusesChange={setStatuses} onAnalysisTypesChange={setAnalysisTypes} />
    </div>
  )
}

function ConfigPanel({ statuses, analysisTypes, onStatusesChange, onAnalysisTypesChange }: {
  statuses: string[]
  analysisTypes: string[]
  onStatusesChange: (x: string[]) => void
  onAnalysisTypesChange: (x: string[]) => void
}) {
  const [s, setS] = useState(statuses.join('\n'))
  const [a, setA] = useState(analysisTypes.join('\n'))

  return (
    <div className="group">
      <h3>配置管理</h3>
      <div className="muted">每行一项，保存后应用到选择列表</div>
      <div className="row">
        <div>
          <div>状态</div>
          <textarea rows={6} value={s} onChange={(e) => setS(e.target.value)} />
          <div className="row"><button onClick={() => onStatusesChange(splitLines(s))}>保存状态</button></div>
        </div>
        <div>
          <div>AI分析类型</div>
          <textarea rows={6} value={a} onChange={(e) => setA(e.target.value)} />
          <div className="row"><button onClick={() => onAnalysisTypesChange(splitLines(a))}>保存AI类型</button></div>
        </div>
      </div>
    </div>
  )
}

function splitLines(s: string) {
  return s.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
}


