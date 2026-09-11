import type { DefaultDocumentIDType, PayloadRequest } from 'payload'

import type { PhoneModel, Product } from '@/payload-types'

/**
 * Keeps the commerce plugin's variant graph in step with the catalog.
 *
 * Model:
 *   product          = one design
 *   variantType      = exactly one, "Phone Model"
 *   variantOption    = one per phone model (mirror of `phoneModels`)
 *   variant          = design × phone model, carries the price
 *
 * Nothing here is inventory-aware. Print on demand means every variant is
 * always purchasable while its phone model is active.
 */

export const PHONE_MODEL_VARIANT_TYPE = {
  name: 'phoneModel',
  label: 'Phone Model',
} as const

const idOf = (value: unknown): DefaultDocumentIDType | undefined => {
  if (value && typeof value === 'object' && 'id' in value) {
    return (value as { id: DefaultDocumentIDType }).id
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value as DefaultDocumentIDType
  }
  return undefined
}

export const getPhoneModelVariantTypeID = async ({
  req,
}: {
  req: PayloadRequest
}): Promise<DefaultDocumentIDType> => {
  const { payload } = req

  const existing = await payload.find({
    collection: 'variantTypes',
    depth: 0,
    limit: 1,
    pagination: false,
    req,
    where: { name: { equals: PHONE_MODEL_VARIANT_TYPE.name } },
  })

  if (existing.docs[0]) return existing.docs[0].id

  const created = await payload.create({
    collection: 'variantTypes',
    data: { ...PHONE_MODEL_VARIANT_TYPE },
    depth: 0,
    req,
  })

  return created.id
}

/**
 * Returns the ID of the `variantOption` mirroring a phone model, creating or
 * relabelling it as needed. Called from the phone model's beforeChange hook so
 * the link is written with the document itself (no self-update, no recursion).
 */
export const ensureVariantOptionForPhoneModel = async ({
  phoneModel,
  req,
}: {
  phoneModel: Pick<PhoneModel, 'name' | 'slug' | 'variantOption'>
  req: PayloadRequest
}): Promise<DefaultDocumentIDType> => {
  const { payload } = req
  const variantTypeID = await getPhoneModelVariantTypeID({ req })
  const value = phoneModel.slug ?? phoneModel.name

  const existingID = idOf(phoneModel.variantOption)

  if (existingID !== undefined) {
    // Keep label/value in sync with the phone model
    await payload.update({
      collection: 'variantOptions',
      id: existingID,
      data: { label: phoneModel.name, value },
      depth: 0,
      req,
    })
    return existingID
  }

  // Re-use an orphan option with the same value if one exists (e.g. after re-seeding)
  const orphan = await payload.find({
    collection: 'variantOptions',
    depth: 0,
    limit: 1,
    pagination: false,
    req,
    where: {
      and: [{ variantType: { equals: variantTypeID } }, { value: { equals: value } }],
    },
  })

  if (orphan.docs[0]) return orphan.docs[0].id

  const created = await payload.create({
    collection: 'variantOptions',
    data: {
      label: phoneModel.name,
      value,
      variantType: variantTypeID,
    },
    depth: 0,
    req,
  })

  return created.id
}

/**
 * Ensures a variant exists for the given product on every active phone model.
 * New variants inherit the product's base price. Existing variants are left
 * alone so per-model price overrides survive.
 */
export const syncVariantsForProduct = async ({
  product,
  req,
}: {
  product: Product
  req: PayloadRequest
}): Promise<{ created: number }> => {
  const { payload } = req

  if (!product.enableVariants) return { created: 0 }

  const activeModels = await payload.find({
    collection: 'phoneModels',
    depth: 0,
    pagination: false,
    req,
    where: {
      and: [{ status: { equals: 'active' } }, { variantOption: { exists: true } }],
    },
  })

  const existingVariants = await payload.find({
    collection: 'variants',
    depth: 0,
    pagination: false,
    req,
    where: { product: { equals: product.id } },
  })

  const coveredOptionIDs = new Set<string>()
  for (const variant of existingVariants.docs) {
    for (const option of variant.options ?? []) {
      const id = idOf(option)
      if (id !== undefined) coveredOptionIDs.add(String(id))
    }
  }

  let created = 0

  for (const model of activeModels.docs) {
    const optionID = idOf(model.variantOption)
    if (optionID === undefined || coveredOptionIDs.has(String(optionID))) continue

    await payload.create({
      collection: 'variants',
      data: {
        product: product.id,
        options: [optionID],
        priceInUSDEnabled: true,
        priceInUSD: product.priceInUSD ?? 0,
        _status: 'published',
      },
      depth: 0,
      req,
    })
    created += 1
  }

  return { created }
}

/**
 * When a phone model becomes active, fan out across every published design.
 */
export const syncVariantsForPhoneModel = async ({
  phoneModel,
  req,
}: {
  phoneModel: PhoneModel
  req: PayloadRequest
}): Promise<{ created: number }> => {
  const { payload } = req

  const products = await payload.find({
    collection: 'products',
    depth: 0,
    pagination: false,
    req,
    where: {
      and: [{ _status: { equals: 'published' } }, { enableVariants: { equals: true } }],
    },
  })

  let created = 0
  for (const product of products.docs) {
    const result = await syncVariantsForProduct({ product, req })
    created += result.created
  }

  void phoneModel
  return { created }
}
