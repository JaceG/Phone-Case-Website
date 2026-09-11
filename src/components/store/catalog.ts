import type { Media, PhoneModel, Product } from '@/payload-types'

/**
 * Plain, serialisable view of the catalog for the storefront client tree.
 * Kept deliberately small: the design-switcher preloads the whole catalog
 * so it can swap artwork without a page load.
 */

export type CatalogVariant = {
  id: number
  optionId: number
  price: number
}

export type RenderSet = {
  hero: string | null
  threeQuarter: string | null
  flat: string | null
  /** Vertical-axis spin, scrubbed on scroll. */
  turntable: string[]
  /** Smooth tilted-axis loop, played as the idle motion in the hero. */
  tumble: string[]
  /** Loop phase of each tumble frame when frames are unevenly spaced; null = uniform. */
  tumblePhases: number[] | null
}

export type CatalogDesign = {
  id: number
  slug: string
  title: string
  tagline: string
  story: Product['description'] | null
  palette: string[]
  price: number
  /** Shared renders (one shell for every model until per-model shells exist). */
  renders: RenderSet
  /** Per-phone-model overrides, keyed by phone model id. Any null slot falls back to `renders`. */
  modelRenders: Record<string, Partial<RenderSet>>
  gallery: string[]
  collections: { id: number; title: string; slug: string }[]
  variants: CatalogVariant[]
}

export type CatalogPhoneModel = {
  id: number
  name: string
  slug: string
  brand: PhoneModel['brand']
  status: PhoneModel['status']
  optionId: number | null
  sortOrder: number
}

/** Two families in the UI: iPhone and everything else. */
export type DeviceFamily = 'iphone' | 'android'

export const FAMILIES: DeviceFamily[] = ['iphone', 'android']

export const FAMILY_LABEL: Record<DeviceFamily, string> = { iphone: 'iPhone', android: 'Android' }

export const familyOf = (model: Pick<CatalogPhoneModel, 'brand'>): DeviceFamily =>
  model.brand === 'apple' ? 'iphone' : 'android'

const idOf = (v: unknown): number | null =>
  typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? (v as { id: number }).id : null

const urlOf = (v: unknown): string | null =>
  v && typeof v === 'object' && 'url' in v ? ((v as Media).url ?? null) : null

type RawRenders = {
  hero?: unknown
  threeQuarter?: unknown
  flat?: unknown
  turntable?: { frame?: unknown }[] | null
  tumble?: { frame?: unknown }[] | null
  tumblePhases?: unknown
}

const frameUrls = (frames: { frame?: unknown }[] | null | undefined): string[] =>
  (frames ?? []).map((f) => urlOf(f.frame)).filter((u): u is string => Boolean(u))

const toRenderSet = (r: RawRenders | null | undefined): RenderSet => ({
  hero: urlOf(r?.hero),
  threeQuarter: urlOf(r?.threeQuarter),
  flat: urlOf(r?.flat),
  turntable: frameUrls(r?.turntable),
  tumble: frameUrls(r?.tumble),
  tumblePhases:
    Array.isArray(r?.tumblePhases) && r.tumblePhases.every((n) => typeof n === 'number')
      ? (r.tumblePhases as number[])
      : null,
})

export const toCatalogDesign = (product: Product): CatalogDesign => {
  const variants: CatalogVariant[] = []
  for (const v of product.variants?.docs ?? []) {
    if (!v || typeof v !== 'object') continue
    const optionId = idOf(v.options?.[0])
    if (optionId === null || typeof v.priceInUSD !== 'number') continue
    variants.push({ id: v.id, optionId, price: v.priceInUSD })
  }

  const collections = (product.collections ?? [])
    .map((c) => (c && typeof c === 'object' ? { id: c.id, title: c.title, slug: c.slug ?? '' } : null))
    .filter((c): c is { id: number; title: string; slug: string } => c !== null)

  const modelRenders: Record<string, Partial<RenderSet>> = {}
  for (const entry of product.modelRenders ?? []) {
    const modelId = idOf(entry.phoneModel)
    if (modelId === null) continue
    const set = toRenderSet(entry)
    modelRenders[String(modelId)] = {
      ...(set.hero ? { hero: set.hero } : {}),
      ...(set.threeQuarter ? { threeQuarter: set.threeQuarter } : {}),
      ...(set.flat ? { flat: set.flat } : {}),
      ...(set.turntable.length ? { turntable: set.turntable } : {}),
      ...(set.tumble.length ? { tumble: set.tumble, tumblePhases: set.tumblePhases } : {}),
    }
  }

  return {
    id: product.id,
    slug: product.slug ?? String(product.id),
    title: product.title,
    tagline: product.tagline ?? '',
    story: product.description ?? null,
    palette: (product.palette ?? []).map((p) => p.hex).filter(Boolean),
    price: product.priceInUSD ?? variants[0]?.price ?? 0,
    renders: toRenderSet(product.renders),
    modelRenders,
    gallery: (product.gallery ?? []).map((g) => urlOf(g.image)).filter((u): u is string => Boolean(u)),
    collections,
    variants,
  }
}

export const toCatalogPhoneModel = (model: PhoneModel): CatalogPhoneModel => ({
  id: model.id,
  name: model.name,
  slug: model.slug ?? String(model.id),
  brand: model.brand,
  status: model.status,
  optionId: idOf(model.variantOption),
  sortOrder: model.sortOrder ?? 0,
})

/** Renders for a design as seen on a given phone model, with fallback to the shared set. */
export const rendersFor = (d: CatalogDesign, model: CatalogPhoneModel | null | undefined): RenderSet => {
  const override = model ? d.modelRenders[String(model.id)] : undefined
  if (!override) return d.renders
  return {
    hero: override.hero ?? d.renders.hero,
    threeQuarter: override.threeQuarter ?? d.renders.threeQuarter,
    flat: override.flat ?? d.renders.flat,
    turntable: override.turntable?.length ? override.turntable : d.renders.turntable,
    tumble: override.tumble?.length ? override.tumble : d.renders.tumble,
    tumblePhases: override.tumble?.length ? (override.tumblePhases ?? null) : d.renders.tumblePhases,
  }
}

export const heroImageFor = (d: CatalogDesign, model?: CatalogPhoneModel | null): string | null => {
  const r = rendersFor(d, model)
  return r.hero ?? r.threeQuarter ?? r.flat ?? d.gallery[0] ?? null
}

export const thumbImageFor = (d: CatalogDesign, model?: CatalogPhoneModel | null): string | null => {
  const r = rendersFor(d, model)
  return r.flat ?? r.hero ?? r.threeQuarter ?? d.gallery[0] ?? null
}

export const heroImage = (d: CatalogDesign): string | null => heroImageFor(d, null)

export const thumbImage = (d: CatalogDesign): string | null => thumbImageFor(d, null)

export const variantFor = (d: CatalogDesign, model: CatalogPhoneModel | null | undefined) =>
  model?.optionId != null ? d.variants.find((v) => v.optionId === model.optionId) ?? null : null

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

/** First paragraph of the lexical story as plain text, for places that want one short block. */
export const storyText = (d: CatalogDesign, max = 170): string => {
  const root = (d.story as { root?: { children?: unknown[] } } | null)?.root
  const walk = (nodes: unknown[]): string =>
    nodes
      .map((n) => {
        const node = n as { type?: string; text?: string; children?: unknown[] }
        if (node.type === 'text') return node.text ?? ''
        return node.children ? walk(node.children) : ''
      })
      .join('')
  const paragraphs = (root?.children ?? []) as { type?: string; children?: unknown[] }[]
  const first = paragraphs.find((p) => p.type === 'paragraph')
  const text = (first ? walk(first.children ?? []) : '') || d.tagline
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}
