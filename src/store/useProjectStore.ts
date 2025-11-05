import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Camera, ProjectData } from '@/types'
import { createCamera, deleteCameraApi, getCameras, getConfig, getProject, updateCameraApi, updateConfig, updateProject, uploadFile } from '@/api/client'

interface ProjectState {
  floorplanDataUrl: string | null
  cameras: Camera[]
  statuses: string[]
  analysisTypes: string[]
  selectedCameraId: string | null
  projectId: string
  setFloorplan: (dataUrl: string | null) => void
  addCameraAt: (x: number, y: number) => void
  updateCamera: (id: string, patch: Partial<Camera>) => void
  removeCamera: (id: string) => void
  selectCamera: (id: string | null) => void
  setStatuses: (items: string[]) => void
  setAnalysisTypes: (items: string[]) => void
  exportProject: () => ProjectData
  importProject: (data: ProjectData) => void
  initialize: (projectId?: string) => Promise<void>
}

const STORAGE_KEY = 'food-safety-site-survey@v1'

function loadInitialState(): Pick<ProjectState, 'floorplanDataUrl' | 'cameras' | 'statuses' | 'analysisTypes'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ProjectData
      return {
        floorplanDataUrl: parsed.floorplanDataUrl,
        cameras: parsed.cameras,
        statuses: parsed.statuses?.length ? parsed.statuses : [
          '清晰可用', '模糊不清', '损坏', '遮挡'
        ],
        analysisTypes: parsed.analysisTypes?.length ? parsed.analysisTypes : [
          '打电话', '吸烟', '鼠患', '未带口罩'
        ]
      }
    }
  } catch {}
  return {
    floorplanDataUrl: null,
    cameras: [],
    statuses: ['清晰可用', '模糊不清'],
    analysisTypes: ['打电话', '吸烟', '鼠患', '未带口罩']
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...loadInitialState(),
  selectedCameraId: null,
  projectId: 'default',

  setFloorplan: async (dataUrl) => {
    if (dataUrl === null) return set({ floorplanDataUrl: null })
    set({ floorplanDataUrl: dataUrl })
    // Best-effort: do nothing here; actual upload handled via App when user selects file (moved there)
  },

  addCameraAt: async (x, y) => {
    const state = get()
    const cam: Camera = {
      id: uuid(),
      name: '摄像头',
      x, y,
      rotationDeg: 0,
      fovAngleDeg: 70,
      fovRadius: 220,
      status: state.statuses[0] ?? null,
      analyses: []
    }
    // optimistic
    set({ cameras: [...state.cameras, cam], selectedCameraId: cam.id })
    const resp = await createCamera(state.projectId, cam)
    set({ cameras: get().cameras.map(c => c.id === cam.id ? { ...c, id: resp.id } : c), selectedCameraId: resp.id })
  },

  updateCamera: async (id, patch) => {
    const prev = get().cameras
    set({ cameras: prev.map(c => c.id === id ? { ...c, ...patch } : c) })
    await updateCameraApi(id, patch)
  },

  removeCamera: async (id) => {
    const state = get()
    set({ cameras: state.cameras.filter(c => c.id !== id), selectedCameraId: state.selectedCameraId === id ? null : state.selectedCameraId })
    await deleteCameraApi(id)
  },

  selectCamera: (id) => set({ selectedCameraId: id }),

  setStatuses: async (items) => {
    set({ statuses: items })
    await updateConfig(get().projectId, { statuses: items })
  },

  setAnalysisTypes: async (items) => {
    set({ analysisTypes: items })
    await updateConfig(get().projectId, { analysisTypes: items })
  },

  exportProject: () => {
    const { floorplanDataUrl, cameras, statuses, analysisTypes } = get()
    return { floorplanDataUrl, cameras, statuses, analysisTypes }
  },

  importProject: (data) => set(() => {
    const next = {
      floorplanDataUrl: data.floorplanDataUrl ?? null,
      cameras: data.cameras ?? [],
      statuses: data.statuses?.length ? data.statuses : ['清晰可用', '模糊不清'],
      analysisTypes: data.analysisTypes?.length ? data.analysisTypes : ['打电话', '吸烟', '鼠患', '未带口罩'],
      selectedCameraId: null
    }
    persist(next)
    return next
  }),

  initialize: async (projectId = 'default') => {
    set({ projectId })
    const p = await getProject(projectId)
    const cams = await getCameras(projectId)
    set({ floorplanDataUrl: p.floorplanUrl || null, statuses: p.statuses, analysisTypes: p.analysisTypes, cameras: cams })
  }
}))

function persist(state: Pick<ProjectState, 'floorplanDataUrl' | 'cameras' | 'statuses' | 'analysisTypes'>) {
  const data: ProjectData = {
    floorplanDataUrl: state.floorplanDataUrl,
    cameras: state.cameras,
    statuses: state.statuses,
    analysisTypes: state.analysisTypes
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}


