import type { Media, Product } from '@/payload-types'

type GalleryEntry = NonNullable<Product['gallery']>[number]

const isMedia = (value: unknown): value is Media =>
  Boolean(value) && typeof value === 'object' && 'url' in (value as object)

/**
 * Product imagery in display order: pipeline renders first (hero,
 * three-quarter, flat), then any extra gallery entries. Shaped like the
 * `gallery` array so the template's Gallery component can consume it.
 */
export const getProductGallery = (product: Partial<Product>): GalleryEntry[] => {
  const renders = product.renders
  const fromRenders: GalleryEntry[] = [renders?.hero, renders?.threeQuarter, renders?.flat]
    .filter(isMedia)
    .map((image) => ({ image }))

  const fromGallery = (product.gallery ?? []).filter((entry) => isMedia(entry.image))

  return [...fromRenders, ...fromGallery]
}

/** Best single image for grids and cards. */
export const getProductThumbnail = (product: Partial<Product>): Media | undefined => {
  const renders = product.renders
  const candidates = [
    renders?.flat,
    renders?.hero,
    renders?.threeQuarter,
    product.gallery?.[0]?.image,
    product.meta?.image,
  ]
  return candidates.find(isMedia)
}
