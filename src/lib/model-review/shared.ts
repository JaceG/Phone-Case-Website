export const statusLabels = {
  draft: 'In preparation',
  review: 'Ready for review',
  changes: 'Changes requested',
  approved: 'Preview approved',
  rejected: 'Rejected',
} as const
export const stageLabels = {
  queued: 'Queued',
  modeling: 'Modeling',
  rendering: 'Rendering',
  ready: 'Ready',
  failed: 'Needs attention',
} as const
export type ReviewStatus = keyof typeof statusLabels
export type BuildStage = keyof typeof stageLabels
export type ReviewModel = {
  id: number
  title: string
  phone: string
  phoneId: number
  brand: string
  slug: string
  batch: string
  priority: string
  stage: BuildStage
  status: ReviewStatus
  sample: string
  version: string
  updatedAt: string
  notes: string
  feedback: string
  error: string
  supplierURL: string
  supplierVariant: string
  cameraCoverage: string
  images: { caption: string; url: string }[]
  references: { title: string; url: string; kind: string; notes?: string | null }[]
  history: {
    at: string
    status: ReviewStatus
    note: string
    geometryVersion: string
    reviewer: number | null
  }[]
}
export type PhoneChoice = { id: number; name: string; brand: string; slug: string }
export function safeLink(url: string | null | undefined) {
  try {
    const u = new URL(url ?? '')
    return ['http:', 'https:'].includes(u.protocol) ? u.href : ''
  } catch {
    return ''
  }
}
export function canReview(model: ReviewModel) {
  return model.stage === 'ready' && model.images.length > 0 && model.version !== 'pending'
}
export function filterModels(
  models: ReviewModel[],
  query: string,
  status: string,
  brand: string,
  batch: string,
) {
  const q = query.trim().toLowerCase()
  return models.filter(
    (m) =>
      (!q || `${m.title} ${m.phone} ${m.supplierVariant} ${m.batch}`.toLowerCase().includes(q)) &&
      (status === 'all' ||
        (status === 'attention'
          ? m.stage === 'failed' || m.status === 'changes'
          : m.status === status)) &&
      (brand === 'all' || m.brand === brand) &&
      (batch === 'all' || m.batch === batch),
  )
}
