import { getPayload } from 'payload'
import config from '@payload-config'
import {
  approvedModelVersions,
  modelAssets,
  hasCurrentApproval,
} from '@/lib/storefront/approvedModels'
import type { StudioPresentation } from '@/lib/studio-publish/types'
import type { CasePhoneOption } from '@/lib/commerce/groupCartDesigns'

export async function GET(request: Request) {
  const productId = Number(new URL(request.url).searchParams.get('product'))
  if (!Number.isSafeInteger(productId) || productId < 1)
    return Response.json({ error: 'Choose a valid design.' }, { status: 400 })

  const payload = await getPayload({ config })
  const products = await payload.find({
    collection: 'products',
    overrideAccess: false,
    depth: 0,
    limit: 1,
    where: { and: [{ id: { equals: productId } }, { _status: { equals: 'published' } }] },
    select: { priceInUSD: true, slug: true, studioPresentation: true },
  })
  if (!products.docs[0]) return Response.json({ error: 'Design not available.' }, { status: 404 })
  const [variants, models, approvals] = await Promise.all([
    payload.find({
      collection: 'variants',
      overrideAccess: false,
      depth: 0,
      pagination: false,
      where: { and: [{ product: { equals: productId } }, { _status: { equals: 'published' } }] },
      select: { options: true, priceInUSD: true },
    }),
    payload.find({
      collection: 'phoneModels',
      overrideAccess: false,
      depth: 0,
      pagination: false,
      where: { status: { equals: 'active' } },
      sort: 'sortOrder',
      select: { name: true, slug: true, variantOption: true },
    }),
    approvedModelVersions(payload),
  ])
  const options: CasePhoneOption[] = models.docs.flatMap((model) => {
    const asset = modelAssets[model.slug ?? '']
    if (!hasCurrentApproval(asset, approvals.get(model.id))) return []
    const presentation = products.docs[0].studioPresentation as unknown as StudioPresentation | null
    if (
      presentation
        ? presentation.models[String(model.id)]?.version !== asset.version
        : !asset.designs[products.docs[0].slug]
    )
      return []
    const optionId =
      typeof model.variantOption === 'object' ? model.variantOption?.id : model.variantOption
    const variant = variants.docs.find((v) =>
      v.options?.some((o) => (typeof o === 'object' ? o.id : o) === optionId),
    )
    const price = variant?.priceInUSD ?? products.docs[0]?.priceInUSD
    return variant && typeof price === 'number'
      ? [{ variantId: variant.id, phoneModelId: model.id, name: model.name, price }]
      : []
  })
  return Response.json({ options })
}
