/** Trusted local operator tool. Images stay private; importing never approves a model. */
import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { createLocalReq, getPayload, type PayloadRequest } from 'payload'
import config from '../../src/payload.config'
import { withReviewLock } from '../../src/lib/model-review/server'
import { safeLink } from '../../src/lib/model-review/shared'
import type { CaseBlank } from '../../src/payload-types'

export type ReviewPackage = {
  id: number
  slug: string
  expectedUpdatedAt: string
  geometryFile: string
  notes: string
  images: { caption: string; file: string }[]
  references: NonNullable<CaseBlank['references']>
  supplierURL?: string
  supplierVariant?: string
  cameraCoverage: 'fineHoles' | 'open' | 'unknown'
}
export async function importPackage(entry: ReviewPackage, root: string, req: PayloadRequest) {
  if (
    !Number.isSafeInteger(entry.id) ||
    entry.id < 1 ||
    !entry.expectedUpdatedAt ||
    !entry.slug ||
    typeof entry.notes !== 'string'
  )
    throw new Error('Package needs id, slug, expectedUpdatedAt and notes.')
  if (!Array.isArray(entry.images) || entry.images.length < 2 || entry.images.length > 20)
    throw new Error('Include 2–20 reference/review images.')
  if (
    !entry.references?.length ||
    entry.references.some(
      (r) =>
        !r.title ||
        !safeLink(r.url) ||
        !['blank', 'finishedCase', 'phone', 'sample'].includes(r.kind),
    )
  )
    throw new Error('Provide model-specific shaping or blank references with source URLs.')
  const geometry = JSON.parse(await fs.readFile(path.resolve(root, entry.geometryFile), 'utf8'))
  if (geometry.slug !== entry.slug)
    throw new Error(
      'Geometry slug must identify this exact phone; do not relabel another model’s shell.',
    )
  const prepared = await Promise.all(
    entry.images.map(async (image) => {
      if (!image.caption) throw new Error('Every review image needs a caption.')
      const data = await sharp(await fs.readFile(path.resolve(root, image.file)), {
        limitInputPixels: 50_000_000,
      })
        .resize({ width: 1600, height: 1800, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer()
      return { caption: image.caption, data }
    }),
  )
  // Version the complete review package so changed pictures invalidate old decisions too.
  const hash = createHash('sha256').update(
    JSON.stringify({
      geometry,
      references: entry.references,
      supplierURL: entry.supplierURL,
      supplierVariant: entry.supplierVariant,
      notes: entry.notes,
      cameraCoverage: entry.cameraCoverage,
    }),
  )
  for (const image of prepared) hash.update(image.caption).update(image.data)
  const version = hash.digest('hex')
  const files: string[] = []
  try {
    return await withReviewLock(req, entry.id, async () => {
      const old = await req.payload.findByID({
        collection: 'caseBlanks',
        id: entry.id,
        req,
        depth: 1,
      })
      const phone = typeof old.phoneModel === 'object' ? old.phoneModel : null
      if (phone?.slug !== entry.slug)
        throw new Error('Package phone does not match the queued model.')
      if (old.geometryVersion === version)
        return { id: old.id, result: 'unchanged; existing decision preserved' }
      if (old.updatedAt !== entry.expectedUpdatedAt)
        throw new Error(
          'Model changed after the worklist was exported. Refresh it before replacing the package.',
        )
      const images = []
      for (const image of prepared) {
        const name = `model-review-${randomUUID()}.png`
        files.push(path.resolve('uploads/production-assets', name))
        const asset = await req.payload.create({
          collection: 'productionAssets',
          req,
          data: { kind: 'other', notes: `Private model review ${entry.id}: ${image.caption}` },
          file: { name, data: image.data, size: image.data.length, mimetype: 'image/png' },
        })
        images.push({ caption: image.caption, image: asset.id })
      }
      await req.payload.update({
        collection: 'caseBlanks',
        id: entry.id,
        req,
        data: {
          title: `${phone.name} — case review`,
          geometryVersion: version,
          geometry,
          reviewImages: images,
          references: entry.references,
          reviewNotes: entry.notes,
          cameraCoverage: entry.cameraCoverage,
          ...(entry.supplierURL !== undefined ? { supplierURL: safeLink(entry.supplierURL) } : {}),
          ...(entry.supplierVariant !== undefined
            ? { supplierVariant: entry.supplierVariant }
            : {}),
        },
      })
      // Geometry hook resets approvals first, then this distinct transition makes it reviewable.
      await req.payload.update({
        collection: 'caseBlanks',
        id: entry.id,
        req,
        data: { previewStatus: 'review', buildStage: 'ready', buildError: '' },
      })
      return { id: entry.id, result: 'ready for review' }
    })
  } catch (error) {
    await Promise.allSettled(files.map((file) => fs.unlink(file)))
    throw error
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2)
  const payload = await getPayload({ config })
  try {
    const req = await createLocalReq({}, payload)
    if (command === 'stage') {
      const [stage, idText, note = ''] = args
      if (
        !['queued', 'modeling', 'rendering', 'failed'].includes(stage) ||
        !/^[1-9]\d*$/.test(idText)
      )
        throw new Error('Usage: stage queued|modeling|rendering|failed ID [note]')
      const id = Number(idText)
      await withReviewLock(req, id, async () => {
        const doc = await payload.findByID({ collection: 'caseBlanks', id, req })
        if (doc.previewStatus === 'approved')
          throw new Error('Reopen the review before starting another pass on an approved model.')
        await payload.update({
          collection: 'caseBlanks',
          id,
          req,
          data: {
            buildStage: stage as CaseBlank['buildStage'],
            previewStatus: 'draft',
            buildError: note,
          },
        })
      })
      console.log(`Model ${id}: ${stage}`)
    } else if (command === 'import') {
      const file = path.resolve(args[0] ?? '')
      const manifest = JSON.parse(await fs.readFile(file, 'utf8'))
      if (!Array.isArray(manifest.models) || !manifest.models.length || manifest.models.length > 50)
        throw new Error('Manifest needs 1–50 model packages.')
      const results = []
      for (const entry of manifest.models) {
        try {
          results.push(
            await importPackage(entry, path.dirname(file), await createLocalReq({}, payload)),
          )
        } catch (error) {
          results.push({
            id: entry.id,
            result: 'failed',
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
      console.log(JSON.stringify(results, null, 2))
      if (results.some((r) => r.result === 'failed')) process.exitCode = 1
    } else throw new Error('Usage: model-review-batch.ts import manifest.json | stage modeling ID')
  } finally {
    await payload.destroy()
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve('pipeline/scripts/model-review-batch.ts')
) {
  await main()
  process.exit(process.exitCode ?? 0)
}
