/**
 * Import pipeline renders into Payload (build-order step 4).
 *
 *   pnpm renders:import                 # = pnpm payload run pipeline/scripts/import-renders.ts
 *   pnpm renders:import meridian        # only these slugs (positional; `payload run` drops --flags)
 *   RENDERS_OUT=other/dir pnpm renders:import
 *   RENDERS_MODEL=galaxy-s25-ultra pnpm renders:import   # write into modelRenders[phoneModel] instead of the shared renders
 *   pnpm tsx pipeline/scripts/import-renders.ts --only meridian --out pipeline/out   # equivalent
 *
 * For every `<slug>_<camera>.png` in pipeline/out (cameras hero, three_quarter,
 * flat) and every `<slug>_turntable_NNN.png`, upload to `media` and point the
 * product with that slug at them: renders.hero / threeQuarter / flat,
 * renders.turntable = ordered [{ frame }], renderStatus = 'ready'.
 *
 * Idempotent: media docs created by earlier runs (matched by their alt text,
 * which this script owns) are deleted after the product points at the new ones.
 * Talks to Postgres directly through the local API; the dev server need not be
 * running.
 */
import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'

import config from '@payload-config'
import { getPayload } from 'payload'
import sharp from 'sharp'

import type { Media } from '@/payload-types'

const STILL_CAMERAS = { hero: 'hero', three_quarter: 'threeQuarter', flat: 'flat' } as const
type CameraFile = keyof typeof STILL_CAMERAS

const args = process.argv.slice(2)
const argValue = (flag: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}
const argList = (flag: string) => {
  const i = args.indexOf(flag)
  if (i < 0) return undefined
  const values: string[] = []
  for (let j = i + 1; j < args.length && !args[j].startsWith('--'); j++) values.push(args[j])
  return values
}

const outDir = path.resolve(argValue('--out') ?? process.env.RENDERS_OUT ?? path.join('pipeline', 'out'))
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--out'))
const only = [...(argList('--only') ?? []), ...positional]
const onlySet = only.length ? new Set(only) : null

const modelSlug = argValue('--model') ?? process.env.RENDERS_MODEL
const altFor = (title: string, camera: string) =>
  modelSlug ? `${title} — ${camera} render (${modelSlug})` : `${title} — ${camera} render`

type Found = {
  stills: Partial<Record<CameraFile, string>>
  turntable: string[]
  tumble: string[]
}

const scanOutputs = async (): Promise<Map<string, Found>> => {
  const bySlug = new Map<string, Found>()
  const get = (slug: string) => {
    let entry = bySlug.get(slug)
    if (!entry) {
      entry = { stills: {}, turntable: [], tumble: [] }
      bySlug.set(slug, entry)
    }
    return entry
  }

  for (const file of (await fs.readdir(outDir)).sort()) {
    if (!file.endsWith('.png')) continue
    const full = path.join(outDir, file)
    const still = /^(.+)_(hero|three_quarter|flat)\.png$/.exec(file)
    if (still) {
      get(still[1]).stills[still[2] as CameraFile] = full
      continue
    }
    const frame = /^(.+)_turntable_(\d{3})\.png$/.exec(file)
    if (frame) {
      get(frame[1]).turntable.push(full)
      continue
    }
    const tumble = /^(.+)_tumble_(\d{3})\.png$/.exec(file)
    if (tumble) get(tumble[1]).tumble.push(full)
  }
  return bySlug
}

const run = async () => {
  const payload = await getPayload({ config })
  const outputs = await scanOutputs()

  let modelId: number | undefined
  if (modelSlug) {
    const { docs } = await payload.find({
      collection: 'phoneModels',
      where: { slug: { equals: modelSlug } },
      depth: 0,
      limit: 1,
    })
    if (!docs[0]) throw new Error(`no phone model with slug "${modelSlug}"`)
    modelId = docs[0].id
  }

  let imported = 0
  for (const [slug, found] of outputs) {
    if (onlySet && !onlySet.has(slug)) continue

    const { docs } = await payload.find({
      collection: 'products',
      where: { slug: { equals: slug } },
      depth: 0,
      limit: 1,
      draft: true,
    })
    const product = docs[0]
    if (!product) {
      payload.logger.warn(`no product with slug "${slug}" — skipping ${Object.keys(found.stills).length} stills / ${found.turntable.length} frames`)
      continue
    }
    const title = product.title ?? slug

    const upload = async (file: string, camera: string): Promise<Media> => {
      let data = await fs.readFile(file)
      let name = path.basename(file)
      let mimetype = 'image/png'
      // Frame loops are preloaded whole on the hero; ship them as lossy WebP
      // with alpha (~8× smaller than the PNG the renderer writes).
      if (camera === 'tumble' || camera === 'turntable') {
        data = await sharp(data).webp({ quality: 82, alphaQuality: 90, effort: 4 }).toBuffer()
        name = name.replace(/\.png$/, '.webp')
        mimetype = 'image/webp'
      }
      return payload.create({
        collection: 'media',
        data: { alt: altFor(title, camera) },
        file: { data, mimetype, name, size: data.byteLength },
        depth: 0,
      })
    }

    const renders: Record<string, unknown> = {}
    const newIds = new Set<number | string>()

    for (const [cameraFile, field] of Object.entries(STILL_CAMERAS)) {
      const file = found.stills[cameraFile as CameraFile]
      if (!file) continue
      const media = await upload(file, cameraFile)
      renders[field] = media.id
      newIds.add(media.id)
    }

    if (found.turntable.length) {
      const frames: { frame: number | string }[] = []
      for (const file of found.turntable) {
        const media = await upload(file, 'turntable')
        frames.push({ frame: media.id })
        newIds.add(media.id)
      }
      renders.turntable = frames
    }

    if (found.tumble.length) {
      const frames: { frame: number | string }[] = []
      for (const file of found.tumble) {
        const media = await upload(file, 'tumble')
        frames.push({ frame: media.id })
        newIds.add(media.id)
      }
      renders.tumble = frames
    }

    if (modelId !== undefined) {
      const idOf = (v: unknown) => (typeof v === 'object' && v ? (v as { id: number }).id : (v as number))
      const others = (product.modelRenders ?? []).filter((entry) => idOf(entry.phoneModel) !== modelId)
      await payload.update({
        collection: 'products',
        id: product.id,
        data: { modelRenders: [...others, { phoneModel: modelId, ...renders }] },
        depth: 0,
      })
    } else {
      await payload.update({
        collection: 'products',
        id: product.id,
        data: { renders, renderStatus: 'ready' },
        depth: 0,
      })
    }

    // Previous runs' media for this design: same alt text, not among the new ids.
    const stale = await payload.find({
      collection: 'media',
      where: {
        or: [...Object.keys(STILL_CAMERAS), 'turntable', 'tumble'].map((camera) => ({
          alt: { equals: altFor(title, camera) },
        })),
      },
      depth: 0,
      limit: 1000,
      pagination: false,
    })
    const staleIds = stale.docs.map((d) => d.id).filter((id) => !newIds.has(id))
    if (staleIds.length) {
      await payload.delete({ collection: 'media', where: { id: { in: staleIds } }, depth: 0 })
    }

    payload.logger.info(
      `${slug}: ${Object.keys(found.stills).join(', ') || 'no stills'}; ${found.turntable.length} turntable + ${found.tumble.length} tumble frames; removed ${staleIds.length} stale media`,
    )
    imported++
  }

  payload.logger.info(`imported renders for ${imported} design(s) from ${outDir}`)
  await payload.destroy()
}

// Top-level await on purpose: `payload run` calls process.exit(0) as soon as
// this module finishes evaluating, so the work has to complete inside it.
try {
  await run()
} catch (err) {
  console.error(err)
  process.exit(1)
}
