import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import cors from '@fastify/cors'
import Database from 'better-sqlite3'
import { nanoid } from 'nanoid'
import fs from 'node:fs'
import path from 'node:path'

const PORT = Number(process.env.PORT || 8080)
const ROOT = path.resolve(process.cwd())
const DATA_DIR = path.join(ROOT, 'data')
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const PUBLIC_DIR = path.join(ROOT, 'public')
const DB_PATH = path.join(DATA_DIR, 'app.db')

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  floorplan_url TEXT
);

CREATE TABLE IF NOT EXISTS cameras (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  rotation_deg REAL NOT NULL,
  fov_angle_deg REAL NOT NULL,
  fov_radius REAL NOT NULL,
  status TEXT,
  analyses TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_configs (
  project_id TEXT PRIMARY KEY,
  statuses TEXT NOT NULL DEFAULT '[]',
  analysis_types TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
`)

const app = Fastify({ logger: true })
await app.register(cors, { origin: true })
await app.register(multipart)
await app.register(fastifyStatic, { root: UPLOAD_DIR, prefix: '/uploads/' })
// serve frontend
await app.register(fastifyStatic, { root: PUBLIC_DIR, prefix: '/' })

function ensureProject(id: string) {
  const row = db.prepare('SELECT id FROM projects WHERE id = ?').get(id)
  if (!row) {
    db.prepare('INSERT INTO projects (id, name, floorplan_url) VALUES (?, ?, ?)').run(id, '默认项目', null)
    db.prepare('INSERT INTO project_configs (project_id, statuses, analysis_types) VALUES (?, ?, ?)')
      .run(id, JSON.stringify(['清晰可用','模糊不清','损坏','遮挡']), JSON.stringify(['打电话','吸烟','鼠患','未带口罩']))
  }
}

app.get('/api/health', async () => ({ ok: true }))

// Project
app.get('/api/projects/:id', async (req: any, reply) => {
  const id = req.params.id
  ensureProject(id)
  const p = db.prepare('SELECT id, name, floorplan_url as floorplanUrl FROM projects WHERE id = ?').get(id)
  const cfg = db.prepare('SELECT statuses, analysis_types as analysisTypes FROM project_configs WHERE project_id = ?').get(id)
  return { ...p, statuses: JSON.parse(cfg.statuses), analysisTypes: JSON.parse(cfg.analysisTypes) }
})

app.put('/api/projects/:id', async (req: any) => {
  const id = req.params.id
  const body = req.body as { name?: string; floorplanUrl?: string }
  ensureProject(id)
  if (body.name !== undefined) db.prepare('UPDATE projects SET name = ? WHERE id = ?').run(body.name, id)
  if (body.floorplanUrl !== undefined) db.prepare('UPDATE projects SET floorplan_url = ? WHERE id = ?').run(body.floorplanUrl, id)
  return { ok: true }
})

// Config
app.get('/api/projects/:id/config', async (req: any) => {
  const id = req.params.id
  ensureProject(id)
  const cfg = db.prepare('SELECT statuses, analysis_types as analysisTypes FROM project_configs WHERE project_id = ?').get(id)
  return { statuses: JSON.parse(cfg.statuses), analysisTypes: JSON.parse(cfg.analysisTypes) }
})

app.put('/api/projects/:id/config', async (req: any) => {
  const id = req.params.id
  const body = req.body as { statuses?: string[]; analysisTypes?: string[] }
  ensureProject(id)
  if (body.statuses) db.prepare('UPDATE project_configs SET statuses = ? WHERE project_id = ?').run(JSON.stringify(body.statuses), id)
  if (body.analysisTypes) db.prepare('UPDATE project_configs SET analysis_types = ? WHERE project_id = ?').run(JSON.stringify(body.analysisTypes), id)
  return { ok: true }
})

// Cameras
app.get('/api/projects/:id/cameras', async (req: any) => {
  const id = req.params.id
  ensureProject(id)
  const rows = db.prepare('SELECT * FROM cameras WHERE project_id = ?').all(id)
  return rows.map(r => ({
    id: r.id, name: r.name, x: r.x, y: r.y, rotationDeg: r.rotation_deg, fovAngleDeg: r.fov_angle_deg, fovRadius: r.fov_radius, status: r.status, analyses: JSON.parse(r.analyses)
  }))
})

app.post('/api/projects/:id/cameras', async (req: any) => {
  const id = req.params.id
  ensureProject(id)
  const body = req.body as { name: string; x: number; y: number; rotationDeg: number; fovAngleDeg: number; fovRadius: number; status: string | null; analyses: string[] }
  const camId = nanoid()
  db.prepare(`INSERT INTO cameras (id, project_id, name, x, y, rotation_deg, fov_angle_deg, fov_radius, status, analyses) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(camId, id, body.name, body.x, body.y, body.rotationDeg, body.fovAngleDeg, body.fovRadius, body.status, JSON.stringify(body.analyses || []))
  return { id: camId }
})

app.put('/api/cameras/:id', async (req: any) => {
  const camId = req.params.id
  const b = req.body as Partial<{ name: string; x: number; y: number; rotationDeg: number; fovAngleDeg: number; fovRadius: number; status: string | null; analyses: string[] }>
  const current = db.prepare('SELECT * FROM cameras WHERE id = ?').get(camId)
  if (!current) return { ok: false }
  const next = {
    name: b.name ?? current.name,
    x: b.x ?? current.x,
    y: b.y ?? current.y,
    rotationDeg: b.rotationDeg ?? current.rotation_deg,
    fovAngleDeg: b.fovAngleDeg ?? current.fov_angle_deg,
    fovRadius: b.fovRadius ?? current.fov_radius,
    status: b.status ?? current.status,
    analyses: JSON.stringify(b.analyses ?? JSON.parse(current.analyses))
  }
  db.prepare('UPDATE cameras SET name=?, x=?, y=?, rotation_deg=?, fov_angle_deg=?, fov_radius=?, status=?, analyses=? WHERE id = ?')
    .run(next.name, next.x, next.y, next.rotationDeg, next.fovAngleDeg, next.fovRadius, next.status, next.analyses, camId)
  return { ok: true }
})

app.delete('/api/cameras/:id', async (req: any) => {
  const camId = req.params.id
  db.prepare('DELETE FROM cameras WHERE id = ?').run(camId)
  return { ok: true }
})

// Upload floorplan
app.post('/api/upload', async (req: any, reply) => {
  const parts = req.parts()
  for await (const part of parts) {
    if (part.type === 'file') {
      const ext = path.extname(part.filename || '') || '.bin'
      const name = `${Date.now()}-${nanoid(6)}${ext}`
      const filePath = path.join(UPLOAD_DIR, name)
      const ws = fs.createWriteStream(filePath)
      await part.file.pipe(ws)
      const url = `/uploads/${name}`
      return { url }
    }
  }
  reply.code(400)
  return { error: 'no file' }
})

// SPA fallback
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && !req.raw.url.startsWith('/api') && !req.raw.url.startsWith('/uploads/')) {
    const indexPath = path.join(PUBLIC_DIR, 'index.html')
    if (fs.existsSync(indexPath)) {
      return reply.type('text/html').send(fs.readFileSync(indexPath))
    }
  }
  reply.code(404).send({ error: 'Not found' })
})

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`)
})


