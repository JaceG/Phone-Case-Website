import type { PayloadRequest } from 'payload'
import { modelAssets } from '@/lib/storefront/approvedModels'
import type { StudioPhone, Geometry } from './types'

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
