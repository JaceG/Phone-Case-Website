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
/** Browsing families follow the phone, independently of preparation batches. */
export function phoneFamily(model: Pick<ReviewModel, 'phone' | 'brand'>) {
  const name = model.phone.trim()
  if (model.brand === 'apple') {
    if (/^iPhone SE\b/i.test(name)) return 'iPhone SE'
    if (/^iPhone Air\b/i.test(name)) return 'iPhone Air'
    const generation = name.match(/^iPhone (\d+)(?:e)?(?:\s|$)/i)
    if (generation) return `iPhone ${generation[1]}`
  }
  if (model.brand === 'samsung') {
    const series = name.match(/^(?:Samsung )?(Galaxy (?:[SA]\d+|Z (?:Fold|Flip)\d*))/i)
    if (series) return series[1]
  }
  if (model.brand === 'google') {
    const generation = name.match(/^(?:Google )?Pixel (\d+)(?:a)?(?:\s|$)/i)
    if (generation) return `Pixel ${generation[1]}`
  }
  return name || 'Other models'
}
export function phoneFamilyOptions(models: ReviewModel[], brand = 'all') {
  const groups = new Map<string, { label: string; brand: string; count: number }>()
  for (const model of models) {
    if (brand !== 'all' && model.brand !== brand) continue
    const label = phoneFamily(model)
    const group = groups.get(label) ?? { label, brand: model.brand, count: 0 }
    group.count++
    groups.set(label, group)
  }
  const brandOrder = ['apple', 'samsung', 'google', 'other']
  return [...groups.values()].sort((a, b) => {
    const rank = (value: string) => {
      const index = brandOrder.indexOf(value)
      return index < 0 ? brandOrder.length : index
    }
    const generation = (label: string) => Number(label.match(/\d+/)?.[0] ?? 0)
    return (
      rank(a.brand) - rank(b.brand) ||
      generation(b.label) - generation(a.label) ||
      a.label.localeCompare(b.label, undefined, { numeric: true })
    )
  })
}
export function filterModels(
  models: ReviewModel[],
  query: string,
  status: string,
  brand: string,
  batch: string,
  family = 'all',
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
      (batch === 'all' || m.batch === batch) &&
      (family === 'all' || phoneFamily(m) === family),
  )
}
