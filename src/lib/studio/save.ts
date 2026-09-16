import { suggestedCopy, plainText } from '@/lib/catalog/designDefaults'
import { createHash, randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { commitTransaction, initTransaction, killTransaction, type PayloadRequest } from 'payload'
import type { StudioRevision, Product } from '@/payload-types'
import { MODEL, exportBounds } from '@/components/case-studio/artwork'
import { validateSave, type StudioDetails, type StudioDocument } from './contract'

export class StudioError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message)
  }
}
export const idOf = (v: number | { id: number }) => (typeof v === 'number' ? v : v.id)
const privateURL = (v: unknown, collection: string) => {
  const file = v as { filename?: string }
  return file?.filename ? `/api/${collection}/file/${encodeURIComponent(file.filename)}` : ''
}
export async function geometryVersion() {
  const glb = await fs.readFile(path.join(process.cwd(), 'public/models/iphone-17-pro-max.glb'))
  return createHash('sha256').update(JSON.stringify(MODEL)).update(glb).digest('hex')
}
export function documentOf(doc: StudioRevision, current: string): StudioDocument {
  return {
    id: doc.id,
    title: doc.title,
    revision: doc.revision,
    product: idOf(doc.product),
    originalURL: privateURL(doc.original, 'artwork'),
    printURL: privateURL(doc.printMaster, 'artwork'),
    previewURL: doc.preview ? privateURL(doc.preview, 'productionAssets') : null,
    placement: doc.placement as StudioDocument['placement'],
    details: doc.details as StudioDetails,
    model: doc.modelSlug,
    geometryVersion: doc.geometryVersion,
    currentGeometry: doc.geometryVersion === current,
    createdAt: doc.createdAt,
  }
}
async function imageFile(value: FormDataEntryValue | null, limit: number) {
  if (!(value instanceof File) || !value.size || value.size > limit * 1024 * 1024)
    throw new StudioError(`Choose an image smaller than ${limit} MB.`)
  const data = Buffer.from(await value.arrayBuffer())
  const metadata = await sharp(data, { limitInputPixels: 50_000_000 }).metadata()
  if (
    !['png', 'jpeg', 'webp'].includes(metadata.format ?? '') ||
    !metadata.width ||
    !metadata.height ||
    (metadata.pages ?? 1) > 1
  )
    throw new StudioError('Use a single JPG, PNG or WebP image.')
  return {
    data,
    metadata,
    ext: metadata.format === 'jpeg' ? 'jpg' : metadata.format!,
    mime: `image/${metadata.format}`,
  }
}
export function story(text: string): Product['description'] {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children: text.split('\n').map((line) => ({
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'text',
            version: 1,
            text: line,
            format: 0,
            detail: 0,
            mode: 'normal',
            style: '',
          },
        ],
      })),
    },
  }
}

export async function saveStudio(form: FormData, req: PayloadRequest) {
  const { payload } = req
  if (typeof form.get('settings') !== 'string') throw new StudioError('Missing design settings.')
  const input = validateSave(JSON.parse(form.get('settings') as string))
  const original = await imageFile(form.get('original'), 30)
  const print = await imageFile(form.get('print'), 8)
  const preview = form.get('preview') ? await imageFile(form.get('preview'), 8) : null
  const bounds = exportBounds(input.placement.printMode)
  if (
    print.metadata.format !== 'png' ||
    print.metadata.width !== bounds.width ||
    print.metadata.height !== bounds.height
  )
    throw new StudioError(
      'The print layout does not match this case and print area. Try saving again.',
    )
  const currentGeometry = await geometryVersion()
  if (form.get('geometryVersion') !== currentGeometry)
    throw new StudioError(
      'The case model changed. Reload the studio and review your placement before saving.',
      409,
    )
  const { details } = input
  const copy = suggestedCopy(details.title)
  if (!details.tagline.trim()) details.tagline = copy.tagline
  if (!details.description.trim()) details.description = copy.description
  const originalHash = createHash('sha256').update(original.data).digest('hex')
  const files: string[] = []
  await initTransaction(req)
  try {
    const previous = input.previous
      ? await payload.findByID({ collection: 'studioRevisions', id: input.previous, depth: 0, req })
      : null
    if (previous) {
      const latest = await payload.find({
        collection: 'studioRevisions',
        req,
        depth: 0,
        limit: 1,
        where: { lineage: { equals: previous.lineage } },
        sort: '-revision',
      })
      const saved = latest.docs[0]
      // Repeated saves (including a retry whose response was lost) are reads.
      // Preserve existing previews and avoid uploading identical print files.
      if (
        saved &&
        saved.originalHash === originalHash &&
        saved.geometryVersion === currentGeometry &&
        saved.modelSlug === input.model &&
        isDeepStrictEqual(saved.placement, input.placement) &&
        isDeepStrictEqual(saved.details, details)
      ) {
        const populated = await payload.findByID({
          collection: 'studioRevisions',
          id: saved.id,
          req,
          depth: 1,
        })
        await commitTransaction(req)
        return { ...documentOf(populated, currentGeometry), unchanged: true }
      }
      if (latest.docs[0]?.id !== previous.id)
        throw new StudioError(
          'This design was updated in another window. Reopen the design to load its latest changes.',
          409,
        )
    }
    if (details.collection)
      await payload.findByID({ collection: 'categories', id: details.collection, req, depth: 0 })
    const conflict = await payload.find({
      collection: 'products',
      req,
      draft: true,
      depth: 0,
      limit: 1,
      where: { slug: { equals: details.slug } },
    })
    if (conflict.docs.length && (!previous || conflict.docs[0].id !== idOf(previous.product)))
      throw new StudioError('That product URL is already used. Choose a different URL.')
    const lineage = previous?.lineage ?? randomUUID()
    const revision = (previous?.revision ?? 0) + 1
    const uploadArtwork = async (image: typeof original, suffix: string) => {
      const name = `studio-${randomUUID()}-${suffix}.${image.ext}`
      files.push(path.join(process.cwd(), 'uploads/artwork', name))
      return payload.create({
        collection: 'artwork',
        req,
        depth: 0,
        file: { data: image.data, name, mimetype: image.mime, size: image.data.length },
        data: {
          license: details.license,
          designer: details.designer,
          colorProfile: 'sRGB',
          licenseNotes: `Source: ${details.source}\nPermission: ${details.permission}\nStudio ${lineage}, revision ${revision}, ${suffix}.`,
        },
      })
    }
    const originalID =
      previous?.originalHash === originalHash
        ? idOf(previous.original)
        : (await uploadArtwork(original, 'original')).id
    const printMaster = await uploadArtwork(print, 'print')
    let previewID: number | undefined
    if (preview) {
      const name = `studio-${randomUUID()}-preview.${preview.ext}`
      files.push(path.join(process.cwd(), 'uploads/production-assets', name))
      previewID = (
        await payload.create({
          collection: 'productionAssets',
          req,
          depth: 0,
          file: { data: preview.data, name, mimetype: preview.mime, size: preview.data.length },
          data: {
            kind: 'other',
            notes: `Private Studio preview. ${lineage}, revision ${revision}.`,
          },
        })
      ).id
    }
    // Reserve the version before writing the product. Unique versionKey serializes
    // competing saves in the database; the loser rolls back all related records.
    const product = previous
      ? await payload.findByID({
          collection: 'products',
          id: idOf(previous.product),
          req,
          draft: true,
          depth: 0,
        })
      : await payload.create({
          collection: 'products',
          req,
          draft: true,
          depth: 0,
          data: {
            title: details.title,
            slug: details.slug,
            _status: 'draft',
            enableVariants: true,
            priceInUSDEnabled: true,
            priceInUSD: Math.round(details.price * 100),
          },
        })
    const saved = await payload.create({
      collection: 'studioRevisions',
      req,
      depth: 0,
      data: {
        title: details.title,
        lineage,
        revision,
        versionKey: `${lineage}:${revision}`,
        product: product.id,
        original: originalID,
        originalHash,
        printMaster: printMaster.id,
        preview: previewID,
        modelSlug: MODEL.slug,
        geometryVersion: currentGeometry,
        geometrySnapshot: MODEL,
        placement: input.placement,
        details,
        savedBy: req.user!.id,
      },
    })
    await payload.update({
      collection: 'products',
      id: product.id,
      req,
      draft: true,
      depth: 0,
      data: {
        title: details.title,
        slug: details.slug,
        _status: 'draft',
        artwork: printMaster.id,
        tagline: details.tagline,
        description:
          plainText(product.description) === details.description
            ? product.description
            : story(details.description),
        collections: details.collection ? [details.collection] : [],
        priceInUSDEnabled: true,
        priceInUSD: Math.round(details.price * 100),
        renderStatus: 'pending',
        studioPresentation: null,
        // Old renders must not masquerade as a preview of revised artwork.
        renders: {
          hero: null,
          threeQuarter: null,
          flat: null,
          turntable: [],
          tumble: [],
          tumblePhases: null,
        },
        modelRenders: [],
        gallery: [],
      },
    })
    const populated = await payload.findByID({
      collection: 'studioRevisions',
      id: saved.id,
      req,
      depth: 1,
    })
    await commitTransaction(req)
    return documentOf(populated, currentGeometry)
  } catch (error) {
    await killTransaction(req)
    await Promise.allSettled(files.map((file) => fs.unlink(file)))
    if (error instanceof StudioError) throw error
    // Includes the unique revision key losing a concurrent save.
    if (error instanceof Error && /unique|duplicate|versionKey/i.test(error.message))
      throw new StudioError(
        'Another save used this revision or product URL. Reload the latest draft.',
        409,
      )
    throw error
  }
}
