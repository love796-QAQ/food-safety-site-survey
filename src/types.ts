export type CameraStatus = string
export type AnalysisType = string

export interface Camera {
  id: string
  name: string
  x: number
  y: number
  rotationDeg: number
  fovAngleDeg: number
  fovRadius: number
  status: CameraStatus | null
  analyses: AnalysisType[]
}

export interface ProjectData {
  floorplanDataUrl: string | null
  cameras: Camera[]
  statuses: CameraStatus[]
  analysisTypes: AnalysisType[]
}


