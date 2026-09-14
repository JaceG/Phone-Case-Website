import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import { APIError, type CollectionBeforeChangeHook } from 'payload'
import { priceCases } from '@/lib/commerce/bundlePricing'

const relationshipID = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) return relationshipID(value.id)
}

export const applyCaseOffer: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const currency = data.currency ?? originalDoc?.currency ?? 'USD'
  const items = data.items ?? originalDoc?.items ?? []
  const lines = []
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1)
      throw new APIError('Choose a whole number of cases.', 400)
    const productID = relationshipID(item.product)
    if (productID === undefined) throw new APIError('A design is required.', 400)
    const product = await req.payload.findByID({
      collection: 'products',
      id: productID,
      depth: 0,
      req,
    })
    const variantID = relationshipID(item.variant)
    let priced = product as unknown as Record<string, unknown>
    if (variantID !== undefined) {
      const variant = await req.payload.findByID({
        collection: 'variants',
        id: variantID,
        depth: 0,
        req,
      })
      if (String(relationshipID(variant.product)) !== String(productID))
        throw new APIError('This phone option belongs to a different design.', 400)
      priced = variant as unknown as Record<string, unknown>
    } else if (product.enableVariants) {
      throw new APIError('Choose your phone model first.', 400)
    }
    const unitPrice = priced[`priceIn${currency}`]
    if (typeof unitPrice !== 'number' || !Number.isSafeInteger(unitPrice) || unitPrice < 0)
      throw new APIError('This case does not have a valid price.', 400)
    lines.push({ unitPrice, quantity: item.quantity })
  }
  const totals = priceCases(lines)
  data.subtotal = currency === 'USD' ? totals.subtotal : totals.regularSubtotal
  return data
}

export const CartsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  hooks: {
    ...defaultCollection.hooks,
    beforeChange: [...(defaultCollection.hooks?.beforeChange ?? []), applyCaseOffer],
  },
})
