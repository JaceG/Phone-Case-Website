import { plainText, relationID } from '@/lib/catalog/designDefaults'
import type { StudioDetails } from '@/lib/studio/contract'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { commitTransaction, initTransaction, killTransaction, type PayloadRequest } from 'payload'
import { modelAssets } from '@/lib/storefront/approvedModels'
import { idOf, StudioError } from '@/lib/studio/save'
import { adaptPlacement, validatePlacement } from './placement'
import { jobDirectory, latestJob, writeJob, imageURL } from './jobs'
import type { StudioPhone, RenderJob, Geometry, StudioPresentation } from './types'
import type { Placement } from '@/components/case-studio/artwork'

export async function approvedPhones(req: PayloadRequest): Promise<StudioPhone[]> {
  const reviews = await req.payload.find({
    collection: 'caseBlanks',
    req,
    depth: 1,
    pagination: false,
    overrideAccess: false,
    where: {
      and: [{ previewStatus: { equals: 'approved' } }, { cameraCoverage: { equals: 'fineHoles' } }],
    },
  })
  return reviews.docs
    .flatMap((r) => {
      const phone = r.phoneModel
      if (typeof phone !== 'object' || phone.status !== 'active' || !phone.slug) return []
      const asset = modelAssets[phone.slug]
      if (!asset || asset.version !== r.geometryVersion) return []
      return [
        {
          id: phone.id,
          name: phone.name,
          slug: phone.slug,
          brand: phone.brand,
          version: r.geometryVersion,
          geometryURL: asset.geometry,
          params: r.geometry as unknown as Geometry,
        },
      ]
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
}
export async function requireLatest(revision: number, req: PayloadRequest) {
  const saved = await req.payload.findByID({
    collection: 'studioRevisions',
    id: revision,
    req,
    depth: 1,
    overrideAccess: false,
  })
  const latest = await req.payload.find({
    collection: 'studioRevisions',
    req,
    depth: 0,
    limit: 1,
    where: { lineage: { equals: saved.lineage } },
    sort: '-revision',
  })
  if (latest.docs[0]?.id !== saved.id)
    throw new StudioError('A newer draft exists. Open it and generate fresh previews.', 409)
  return saved
}
export async function createRenderJob(
  input: { revision: number; phones: number[]; placements?: Record<string, Placement> },
  req: PayloadRequest,
) {
  if (
    !Number.isSafeInteger(input.revision) ||
    !Array.isArray(input.phones) ||
    !input.phones.length ||
    input.phones.length > 100 ||
    input.phones.some((id) => !Number.isSafeInteger(id))
  )
    throw new StudioError('Save a draft and choose at least one phone.')
  const saved = await requireLatest(input.revision, req)
  const previous = await latestJob(saved.id)
  if (previous && ['queued', 'rendering'].includes(previous.status)) return previous
  const available = await approvedPhones(req)
  const phones = [...new Set(input.phones)].map((id) => {
    const phone = available.find((p) => p.id === id)
    if (!phone)
      throw new StudioError('A chosen phone is no longer approved. Refresh the model list.')
    return phone
  })
  const original = saved.original
  if (
    typeof original !== 'object' ||
    !original.filename ||
    path.basename(original.filename) !== original.filename
  )
    throw new StudioError('The original artwork is unavailable.')
  const id = randomUUID(),
    now = new Date().toISOString()
  const job: RenderJob = {
    id,
    revision: saved.id,
    product: idOf(saved.product),
    createdAt: now,
    updatedAt: now,
    status: 'queued',
    completed: 0,
    slug: (saved.details as { slug: string }).slug,
    title: saved.title,
    original: `original${path.extname(original.filename)}`,
    models: phones.map((phone) => ({
      ...phone,
      placement: validatePlacement(
        input.placements?.[String(phone.id)] ??
          adaptPlacement(saved.placement as Placement, phone.params),
        phone.params,
      ),
    })),
  }
  const dir = jobDirectory(id)
  await fs.mkdir(dir, { recursive: true })
  await fs.copyFile(
    path.join(process.cwd(), 'uploads/artwork', original.filename),
    path.join(dir, job.original),
  )
  await writeJob(job)
  const log = await fs.open(path.join(dir, 'worker.log'), 'a')
  try {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', path.join(process.cwd(), 'pipeline/scripts/render-studio-job.ts'), id],
      { cwd: process.cwd(), detached: true, stdio: ['ignore', log.fd, log.fd] },
    )
    await new Promise<void>((resolve, reject) => {
      child.once('spawn', resolve)
      child.once('error', reject)
    })
    // The worker owns status from here; avoid overwriting a fast first update.
    child.unref()
  } catch (error) {
    job.status = 'failed'
    job.error = 'The local rendering worker could not start. Check Blender and try again.'
    await writeJob(job)
    throw error
  } finally {
    await log.close()
  }
  return job
}
export function privatePresentation(job: RenderJob): StudioPresentation {
  return {
    revision: job.revision,
    job: job.id,
    gallery: [imageURL(job.id, 'artwork', 'artwork')],
    models: Object.fromEntries(
      job.models.map((m) => [
        String(m.id),
        {
          version: m.version,
          geometry: m.geometryURL,
          silicone: m.placement.silicone,
          hero: imageURL(job.id, m.slug, 'hero'),
          threeQuarter: imageURL(job.id, m.slug, 'three_quarter'),
          flat: imageURL(job.id, m.slug, 'flat'),
          detail: imageURL(job.id, m.slug, 'detail'),
          texture: imageURL(job.id, m.slug, 'texture'),
        },
      ]),
    ),
  }
}
export async function publishJob(job: RenderJob, req: PayloadRequest) {
  if (!['ready', 'published'].includes(job.status))
    throw new StudioError('Wait for all previews to finish before publishing.')
  const dir = jobDirectory(job.id)
  let lock
  try {
    lock = await fs.open(path.join(dir, 'publishing.lock'), 'wx')
  } catch {
    throw new StudioError('This design is already being published. Please wait.', 409)
  }
  const created: { id: number; filename: string }[] = []
  try {
    const saved = await requireLatest(job.revision, req)
    const requireLatestRender = async () => {
      if ((await latestJob(job.revision))?.id !== job.id)
        throw new StudioError('Newer previews exist. Review and publish the latest previews.', 409)
    }
    await requireLatestRender()
    const phones = await approvedPhones(req)
    if (job.models.some((m) => !phones.some((p) => p.id === m.id && p.version === m.version)))
      throw new StudioError(
        'A model changed or lost approval. Generate new previews before publishing.',
        409,
      )
    const product = await req.payload.findByID({
      collection: 'products',
      id: job.product,
      req,
      depth: 0,
      draft: false,
    })
    if (
      (product.studioPresentation as unknown as StudioPresentation)?.job === job.id &&
      product._status === 'published'
    )
      return { url: `/products/${job.slug}` }
    const draft = await req.payload.findByID({
      collection: 'products',
      id: job.product,
      req,
      depth: 0,
      draft: true,
    })
    const details = saved.details as StudioDetails
    if (
      draft.title !== details.title ||
      draft.slug !== details.slug ||
      (draft.tagline ?? '') !== details.tagline ||
      plainText(draft.description) !== details.description ||
      draft.priceInUSD !== Math.round(details.price * 100) ||
      relationID(draft.collections?.[0]) !== details.collection
    )
      throw new StudioError(
        'Design details changed in admin. Reopen this design in Studio, save a draft and generate fresh previews.',
        409,
      )
    const snapshot = privatePresentation(job)
    await initTransaction(req)
    const mediaIDs: Record<string, number> = {}
    const upload = async (file: string, label: string) => {
      const data = await fs.readFile(path.join(dir, file))
      const media = await req.payload.create({
        collection: 'media',
        req,
        depth: 0,
        file: {
          data,
          size: data.length,
          name: `studio-${job.id}-${label}.webp`,
          mimetype: 'image/webp',
        },
        data: { alt: `${job.title} — ${label}` },
      })
      created.push({ id: media.id, filename: media.filename! })
      mediaIDs[label] = media.id
      return `/api/media/file/${encodeURIComponent(media.filename!)}`
    }
    snapshot.gallery = [await upload('artwork.webp', 'artwork')]
    for (const m of job.models) {
      const entry = snapshot.models[String(m.id)]
      for (const [key, view] of [
        ['hero', 'hero'],
        ['threeQuarter', 'three_quarter'],
        ['flat', 'flat'],
        ['detail', 'detail'],
        ['texture', 'texture'],
      ] as const)
        entry[key] = await upload(`${m.slug}/${view}.webp`, `${m.slug}-${view}`)
    }
    // Recheck after uploads; a changed draft must not publish the old preview set.
    await requireLatest(saved.id, req)
    await requireLatestRender()
    await req.payload.update({
      collection: 'products',
      id: job.product,
      req,
      depth: 0,
      draft: false,
      data: {
        title: draft.title,
        slug: draft.slug,
        tagline: draft.tagline,
        description: draft.description,
        collections: draft.collections,
        palette: draft.palette,
        meta: draft.meta,
        relatedProducts: draft.relatedProducts,
        catalogDefaults: draft.catalogDefaults,
        artwork: draft.artwork,
        priceInUSD: draft.priceInUSD,
        priceInUSDEnabled: true,
        renders: {
          hero: mediaIDs[`${job.models[0].slug}-hero`],
          flat: mediaIDs[`${job.models[0].slug}-flat`],
          threeQuarter: mediaIDs[`${job.models[0].slug}-three_quarter`],
          turntable: [],
          tumble: [],
          tumblePhases: [],
        },
        modelRenders: [],
        gallery: [{ image: mediaIDs.artwork }],
        _status: 'published',
        studioPresentation: snapshot as never,
        renderStatus: 'ready',
      },
    })
    await commitTransaction(req)
    job.status = 'published'
    job.publishedURL = `/products/${job.slug}`
    await writeJob(job).catch(() => {})
    return { url: job.publishedURL }
  } catch (error) {
    await killTransaction(req)
    // On rollback, the corresponding public files are no longer attached to records.
    await Promise.allSettled(
      created.map((m) => fs.unlink(path.join(process.cwd(), 'public/media', m.filename))),
    )
    throw error
  } finally {
    await lock.close()
    await fs.unlink(path.join(dir, 'publishing.lock')).catch(() => {})
  }
}
