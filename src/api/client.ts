const API_BASE = import.meta.env.VITE_API_BASE || ''

export async function getProject(id: string) {
  const r = await fetch(`${API_BASE}/api/projects/${id}`)
  return await r.json()
}

export async function updateProject(id: string, data: { name?: string; floorplanUrl?: string }) {
  await fetch(`${API_BASE}/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

export async function getCameras(projectId: string) {
  const r = await fetch(`${API_BASE}/api/projects/${projectId}/cameras`)
  return await r.json()
}

export async function createCamera(projectId: string, data: any) {
  const r = await fetch(`${API_BASE}/api/projects/${projectId}/cameras`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  return await r.json()
}

export async function updateCameraApi(id: string, data: any) {
  await fetch(`${API_BASE}/api/cameras/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

export async function deleteCameraApi(id: string) {
  await fetch(`${API_BASE}/api/cameras/${id}`, { method: 'DELETE' })
}

export async function getConfig(projectId: string) {
  const r = await fetch(`${API_BASE}/api/projects/${projectId}/config`)
  return await r.json()
}

export async function updateConfig(projectId: string, data: { statuses?: string[]; analysisTypes?: string[] }) {
  await fetch(`${API_BASE}/api/projects/${projectId}/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

export async function uploadFile(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: fd })
  return await r.json()
}


