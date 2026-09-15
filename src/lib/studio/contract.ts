import { MODEL, parseProject, type Placement } from '@/components/case-studio/artwork'

export type StudioDetails = {
  title: string
  slug: string
  price: number
  tagline: string
  description: string
  collection: number | null
  license: 'original' | 'commissioned' | 'licensed' | 'revenueShare'
  designer: string
  source: string
  permission: string
}
export type StudioSave = {
  previous: number | null
  details: StudioDetails
  placement: Placement
  model: string
}
export type StudioDocument = {
  id: number
  revision: number
  title: string
  product: number
  originalURL: string
  previewURL: string | null
  printURL: string
  placement: Placement
  details: StudioDetails
  model: string
  geometryVersion: string
  currentGeometry: boolean
  createdAt: string
}
export const emptyDetails: StudioDetails = {
  title: '',
  slug: '',
  price: 39,
  tagline: '',
  description: '',
  collection: null,
  license: 'original',
  designer: '',
  source: '',
  permission: '',
}

export function validateSave(input: unknown): StudioSave {
  const v = input as Partial<StudioSave> | null
  const d = v?.details
  if (!v || !d || v.model !== MODEL.slug) throw new Error('Choose the available case model.')
  if (v.previous !== null && (!Number.isSafeInteger(v.previous) || (v.previous ?? 0) < 1))
    throw new Error('Invalid saved revision.')
  for (const [key, max] of Object.entries({
    title: 150,
    slug: 100,
    tagline: 200,
    description: 8000,
    designer: 200,
    source: 2000,
    permission: 8000,
  })) {
    const value = d[key as keyof StudioDetails]
    if (typeof value !== 'string' || value.length > max) throw new Error(`Check the ${key} field.`)
  }
  if (!d.title.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug))
    throw new Error('Enter a title and a URL using lowercase letters, numbers and hyphens.')
  if (
    !Number.isFinite(d.price) ||
    d.price <= 0 ||
    d.price > 10000 ||
    Math.abs(d.price * 100 - Math.round(d.price * 100)) > 0.00001
  )
    throw new Error('Enter a price greater than zero, with at most two decimal places.')
  if (d.collection !== null && (!Number.isSafeInteger(d.collection) || d.collection < 1))
    throw new Error('Choose a collection from the list.')
  if (!['original', 'commissioned', 'licensed', 'revenueShare'].includes(d.license))
    throw new Error('Choose the artwork permission basis.')
  if (d.license !== 'original' && !d.permission.trim())
    throw new Error('Add the permission or agreement reference for this artwork.')
  // Reuse the editor's bounded placement validation, without accepting its obsolete fade.
  const { placement } = parseProject({
    version: 1,
    model: v.model,
    name: d.title,
    image: 'data:image/png;base64,AA==',
    placement: v.placement,
  })
  return {
    previous: v.previous!,
    model: v.model,
    placement,
    details: { ...d, title: d.title.trim() },
  }
}

export function effectiveDPI(sourceWidth: number, placedWidth: number, pixelsPerMM: number) {
  return Math.round(sourceWidth / (placedWidth / pixelsPerMM / 25.4))
}
