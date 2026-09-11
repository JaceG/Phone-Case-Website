import configPromise from '@payload-config'
import { getPayload } from 'payload'

import {
  toCatalogDesign,
  toCatalogPhoneModel,
  type CatalogDesign,
  type CatalogPhoneModel,
} from '@/components/store/catalog'

export type Storefront = {
  design: CatalogDesign | null
  catalog: CatalogDesign[]
  phoneModels: CatalogPhoneModel[]
}

/**
 * Everything a product page needs, in one place. The whole catalog is
 * loaded because the design-switcher swaps artwork client-side without a
 * page load; at this catalog size that is cheaper than a round trip.
 */
export const loadStorefront = async ({ slug }: { slug?: string } = {}): Promise<Storefront> => {
  const payload = await getPayload({ config: configPromise })

  const [products, models] = await Promise.all([
    payload.find({
      collection: 'products',
      depth: 1,
      draft: false,
      overrideAccess: false,
      pagination: false,
      sort: 'createdAt',
      where: { _status: { equals: 'published' } },
      // No `select` on media: `url` is computed from `filename` in afterRead,
      // so narrowing the media populate to `url` silently yields null.
      populate: {
        variants: { priceInUSD: true, options: true, _status: true },
        categories: { title: true, slug: true },
      },
    }),
    payload.find({
      collection: 'phoneModels',
      depth: 0,
      overrideAccess: false,
      pagination: false,
      sort: 'sortOrder',
      where: { status: { not_equals: 'retired' } },
    }),
  ])

  const catalog = products.docs.map(toCatalogDesign)
  const phoneModels = models.docs.map(toCatalogPhoneModel)

  const design = slug ? (catalog.find((d) => d.slug === slug) ?? null) : (catalog[0] ?? null)

  return { design, catalog, phoneModels }
}
