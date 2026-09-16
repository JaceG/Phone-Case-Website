import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import type { CollectionBeforeValidateHook } from 'payload'
import {
  mayFill,
  hasCustomFormatting,
  plainText,
  relationID,
  richText,
  seoDescription,
  seoTitle,
  suggestedCopy,
} from './designDefaults'

export async function extractPalette(bytes: Buffer): Promise<string[]> {
  const { data, info } = await sharp(bytes)
    .rotate()
    .resize(96, 96, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const bins = new Map<string, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 128) continue
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    const key = [r, g, b].map((v) => Math.floor(v / 32)).join(',')
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    bin.n++
    bin.r += r
    bin.g += g
    bin.b += b
    bins.set(key, bin)
  }
  const picked: number[][] = []
  for (const bin of [...bins.values()].sort((a, b) => b.n - a.n)) {
    const color = [bin.r, bin.g, bin.b].map((v) => Math.round(v / bin.n))
    if (picked.every((p) => Math.hypot(...p.map((v, i) => v - color[i])) > 60)) picked.push(color)
    if (picked.length === 5) break
  }
  return picked.map((c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''))
}

export const autofillProduct: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data
  const current = { ...originalDoc, ...data }
  if (!current.title?.trim()) return data
  const previous = (data.catalogDefaults ?? originalDoc?.catalogDefaults ?? {}) as Record<
    string,
    unknown
  >
  const next = { ...previous }
  const set = (key: string, value: unknown, comparable = current[key]) => {
    if (mayFill(comparable, previous[key])) {
      data[key] = value
      current[key] = value
      next[key] = value
    }
  }
  const copy = suggestedCopy(current.title)
  set('tagline', copy.tagline)
  const text = plainText(current.description)
  if (mayFill(text, previous.description) && !hasCustomFormatting(current.description)) {
    data.description = richText(copy.description)
    current.description = data.description
    next.description = copy.description
  }
  if (current.priceInUSD == null) data.priceInUSD = 3900
  if (current.priceInUSDEnabled == null) data.priceInUSDEnabled = true
  if (current.enableVariants == null) data.enableVariants = true
  if (!current.slug)
    data.slug = current.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100)
  const artwork = relationID(current.artwork)
  const palette = (current.palette ?? []).map((p: { hex: string }) => p.hex)
  if (
    artwork &&
    mayFill(palette, previous.palette) &&
    (!palette.length || previous.artwork !== artwork)
  ) {
    try {
      const file = await req.payload.findByID({ collection: 'artwork', id: artwork, req, depth: 0 })
      if (file.filename && path.basename(file.filename) === file.filename) {
        const colors = await extractPalette(
          await fs.readFile(path.join(process.cwd(), 'uploads/artwork', file.filename)),
        )
        data.palette = colors.map((hex) => ({ hex }))
        next.palette = colors
        next.artwork = artwork
      }
    } catch (error) {
      req.payload.logger.warn({
        msg: 'Palette could not be extracted; existing colors preserved.',
        err: error,
      })
    }
  }
  const meta = { ...originalDoc?.meta, ...data.meta }
  const autoMeta = (key: string, candidate: unknown, comparable = meta[key]) => {
    if (candidate != null && mayFill(comparable, previous[`meta.${key}`])) {
      meta[key] = candidate
      next[`meta.${key}`] = candidate
    }
  }
  autoMeta('title', seoTitle(current.title, process.env.SITE_NAME || 'Phone Case Store'))
  autoMeta('description', seoDescription(current.title, current.tagline))
  const hero = relationID(current.renders?.hero) ?? relationID(current.gallery?.[0]?.image)
  autoMeta('image', hero, relationID(meta.image))
  data.meta = meta
  const related = (current.relatedProducts ?? []).map(relationID)
  if (!related.length) {
    const collectionIDs = (current.collections ?? []).map(relationID).filter(Boolean)
    let candidates = await req.payload.find({
      collection: 'products',
      req,
      depth: 0,
      draft: false,
      limit: 3,
      where: {
        and: [
          { _status: { equals: 'published' } },
          ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
          ...(collectionIDs.length ? [{ collections: { in: collectionIDs } }] : []),
        ],
      },
    })
    if (!candidates.docs.length && collectionIDs.length)
      candidates = await req.payload.find({
        collection: 'products',
        req,
        depth: 0,
        draft: false,
        limit: 3,
        where: {
          and: [
            { _status: { equals: 'published' } },
            ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
          ],
        },
      })
    data.relatedProducts = candidates.docs.map((p) => p.id)
  }
  data.catalogDefaults = next
  return data
}
