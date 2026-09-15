import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { commitTransaction, initTransaction, killTransaction, type PayloadRequest } from 'payload'
import type { CaseBlank } from '@/payload-types'
import { safeLink, type ReviewModel } from './shared'

export class ReviewError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message)
  }
}
export function present(doc: CaseBlank): ReviewModel {
  const phone = typeof doc.phoneModel === 'object' ? doc.phoneModel : null
  const images = (doc.reviewImages ?? []).flatMap((entry) => {
    const file = typeof entry.image === 'object' ? entry.image.filename : null
    return file
      ? [{ caption: entry.caption, url: `/api/productionAssets/file/${encodeURIComponent(file)}` }]
      : []
  })
  return {
    id: doc.id,
    title: doc.title,
    phone: phone?.name ?? doc.title,
    phoneId: phone?.id ?? Number(doc.phoneModel),
    brand: phone?.brand ?? 'other',
    slug: phone?.slug ?? '',
    batch: doc.batch || 'Unassigned',
    priority: doc.priority || 'normal',
    stage: doc.buildStage ?? (images.length ? 'ready' : 'queued'),
    status: doc.previewStatus,
    sample: doc.sampleStatus,
    version: doc.geometryVersion,
    updatedAt: doc.updatedAt,
    notes: doc.reviewNotes ?? '',
    feedback: doc.reviewFeedback ?? '',
    error: doc.buildError ?? '',
    supplierURL: safeLink(doc.supplierURL),
    supplierVariant: doc.supplierVariant ?? '',
    cameraCoverage: doc.cameraCoverage ?? 'unknown',
    images,
    references: (doc.references ?? []).map((r) => ({
      title: r.title,
      url: safeLink(r.url),
      kind: r.kind,
      notes: r.notes,
    })),
    history: (Array.isArray(doc.reviewHistory) ? doc.reviewHistory : []) as ReviewModel['history'],
  }
}
export async function listReviews(req: PayloadRequest) {
  const [models, phones] = await Promise.all([
    req.payload.find({
      collection: 'caseBlanks',
      req,
      overrideAccess: false,
      depth: 1,
      pagination: false,
      sort: '-updatedAt',
    }),
    req.payload.find({
      collection: 'phoneModels',
      req,
      overrideAccess: false,
      depth: 0,
      pagination: false,
      sort: 'name',
    }),
  ])
  return {
    models: models.docs.map(present),
    phones: phones.docs.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand ?? 'other',
      slug: p.slug!,
    })),
  }
}
export async function withReviewLock<T>(req: PayloadRequest, id: number, work: () => Promise<T>) {
  await initTransaction(req)
  try {
    const tid = await req.transactionID
    if (!tid) throw new Error('A database transaction is required.')
    // Same connection as Payload's writes; serializes review/import requests for this model.
    await (req.payload.db as unknown as PostgresAdapter).sessions[tid].db.execute(
      sql`SELECT id FROM case_blanks WHERE id = ${id} FOR UPDATE`,
    )
    const result = await work()
    await commitTransaction(req)
    return result
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}
export async function saveDecision(input: Record<string, unknown>, req: PayloadRequest) {
  const id = Number(input.id)
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    typeof input.updatedAt !== 'string' ||
    typeof input.version !== 'string'
  )
    throw new ReviewError('Invalid model revision.')
  const status = input.status
  if (!['approved', 'changes', 'rejected', 'review', 'note'].includes(String(status)))
    throw new ReviewError('Choose a review action.')
  if (typeof input.feedback !== 'string' || input.feedback.length > 8000)
    throw new ReviewError('Keep feedback under 8,000 characters.')
  const feedback = input.feedback.trim()
  if (['changes', 'rejected'].includes(String(status)) && !feedback)
    throw new ReviewError('Add a note so the next pass knows what to change.')
  return withReviewLock(req, id, async () => {
    const doc = await req.payload.findByID({ collection: 'caseBlanks', id, req, depth: 1 })
    if (doc.updatedAt !== input.updatedAt || doc.geometryVersion !== input.version)
      throw new ReviewError(
        'This model changed since you opened it. Reload the latest version before saving.',
        409,
      )
    const m = present(doc)
    if (
      ['approved', 'review'].includes(String(status)) &&
      (m.stage !== 'ready' || !m.images.length || m.version === 'pending')
    )
      throw new ReviewError('A finished review package is needed before this action.')
    if (status === 'approved' && m.cameraCoverage !== 'fineHoles')
      throw new ReviewError(
        'Verify the covered camera surround and individual openings before approval.',
      )
    const saved = await req.payload.update({
      collection: 'caseBlanks',
      id,
      req,
      depth: 1,
      data: {
        reviewFeedback: feedback,
        ...(status !== 'note' ? { previewStatus: status as CaseBlank['previewStatus'] } : {}),
      },
    })
    return present(saved)
  })
}
export async function queueModels(input: Record<string, unknown>, req: PayloadRequest) {
  if (
    !Array.isArray(input.phoneIds) ||
    !input.phoneIds.length ||
    input.phoneIds.length > 50 ||
    input.phoneIds.some((id) => !Number.isSafeInteger(id) || id < 1)
  )
    throw new ReviewError('Choose 1–50 phone models.')
  const batch = typeof input.batch === 'string' ? input.batch.trim() : ''
  if (!batch || batch.length > 100)
    throw new ReviewError('Enter a batch name under 100 characters.')
  const ids = [...new Set(input.phoneIds as number[])]
  const phones = await req.payload.find({
    collection: 'phoneModels',
    where: { id: { in: ids } },
    pagination: false,
    depth: 0,
    req,
  })
  if (phones.docs.length !== ids.length)
    throw new ReviewError('One of these phones is no longer available.')
  const created: number[] = []
  const existing: number[] = []
  for (const phone of phones.docs) {
    // One candidate per phone/batch; exact alternate supplier blanks can be added in admin.
    const referenceKey = `queue:${batch.toLowerCase()}:${phone.id}`
    const prior = await req.payload.find({
      collection: 'caseBlanks',
      where: { referenceKey: { equals: referenceKey } },
      limit: 1,
      req,
      depth: 0,
    })
    if (prior.docs.length) {
      existing.push(prior.docs[0].id)
      continue
    }
    try {
      const doc = await req.payload.create({
        collection: 'caseBlanks',
        req,
        data: {
          title: `${phone.name} — blank research`,
          phoneModel: phone.id,
          referenceKey,
          batch,
          priority: input.priority === 'high' ? 'high' : 'normal',
          buildStage: 'queued',
          previewStatus: 'draft',
          sampleStatus: 'pending',
          geometryVersion: 'pending',
          geometry: {},
          cameraCoverage: 'unknown',
          availability: 'unverified',
          reviewNotes:
            'Find an exact compatible blank and model-specific shape references. Shared listing photos do not establish this phone’s geometry. Finished printed cases may be used for camera/edge/proportion reference only. Build and validate the shell before importing a review package.',
        },
      })
      created.push(doc.id)
    } catch (error) {
      const raced = await req.payload.find({
        collection: 'caseBlanks',
        where: { referenceKey: { equals: referenceKey } },
        limit: 1,
        req,
        depth: 0,
      })
      if (!raced.docs.length) throw error
      existing.push(raced.docs[0].id)
    }
  }
  return { created, existing }
}
