import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { approvedModelVersions, modelAssets, hasCurrentApproval } from './approvedModels'

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

  const [products, models, approvals] = await Promise.all([
    payload.find({
      collection: 'products',
      joins: { variants: { limit: 1000 } },
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
    approvedModelVersions(payload),
  ])

  const catalog = products.docs.map(toCatalogDesign)
  const phoneModels = models.docs.flatMap((model) => {
    const asset = modelAssets[model.slug ?? '']
    if (!hasCurrentApproval(asset, approvals.get(model.id))) return []
    for (const design of catalog) {
      const product = products.docs.find((p) => p.id === design.id)
      if (product?.studioPresentation) {
        if (design.modelRenders[String(model.id)]?.version !== asset.version)
          delete design.modelRenders[String(model.id)]
        continue
      }
      const images = asset.designs[design.slug]
      if (images) design.modelRenders[String(model.id)] = { ...images, geometry: asset.geometry }
    }
    return [{ ...toCatalogPhoneModel(model), previewVersion: asset.version }]
  })

  for (const design of catalog) {
    if (!products.docs.find((p) => p.id === design.id)?.studioPresentation) continue
    for (const id of Object.keys(design.modelRenders)) {
      const model = phoneModels.find((m) => String(m.id) === id)
      if (!model || design.modelRenders[id].version !== model.previewVersion)
        delete design.modelRenders[id]
    }
    const first = Object.values(design.modelRenders)[0]
    design.renders = {
      hero: null,
      threeQuarter: null,
      flat: null,
      turntable: [],
      tumble: [],
      tumblePhases: null,
      ...first,
    }
  }

  const design = slug ? (catalog.find((d) => d.slug === slug) ?? null) : (catalog[0] ?? null)

  return { design, catalog, phoneModels }
}
