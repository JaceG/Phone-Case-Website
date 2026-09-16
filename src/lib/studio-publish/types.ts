import type { Placement } from '@/components/case-studio/artwork'
import type { RenderSet } from '@/components/store/catalog'
export type Geometry = {
  slug: string
  width_mm: number
  height_mm: number
  depth_mm: number
  template_px_per_mm: number
  back_roll_mm: number
  corner_radius_mm: number
  camera_island: {
    x_mm: number
    y_mm: number
    w_mm: number
    h_mm: number
    corner_radius_mm: number
  }
  holes: { x_mm: number; y_mm: number; d_mm: number }[]
}
export type StudioPhone = {
  id: number
  name: string
  slug: string
  brand: string
  version: string
  geometryURL: string
  params: Geometry
}
export type JobModel = StudioPhone & { placement: Placement }
export type RenderJob = {
  id: string
  revision: number
  product: number
  createdAt: string
  updatedAt: string
  status: 'queued' | 'rendering' | 'ready' | 'failed' | 'published'
  completed: number
  error?: string
  pid?: number
  slug: string
  title: string
  original: string
  models: JobModel[]
  publishedURL?: string
}
export type StudioPresentation = {
  revision: number
  job: string
  models: Record<string, Partial<RenderSet> & { version: string }>
  gallery: string[]
}
