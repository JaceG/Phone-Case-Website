import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import type {
  CollectionBeforeChangeHook,
  Field,
  PayloadRequest,
  RelationshipField,
} from 'payload'

/**
 * Override of the plugin's `variants` collection.
 *
 * The plugin's own beforeChange hook and `options` validator look the parent
 * product up without passing `req`, so they run outside the caller's
 * transaction. That breaks our flow, where variants are created inside the
 * product's afterChange (the product row isn't committed yet). These are the
 * same checks, transaction-aware.
 */

type OptionID = number | string

const toID = (value: unknown): OptionID | undefined => {
  if (value && typeof value === 'object' && 'id' in value) {
    return (value as { id: OptionID }).id
  }
  if (typeof value === 'string' || typeof value === 'number') return value
  return undefined
}

const validateOptions = async (
  values: unknown,
  { data, req }: { data: Record<string, unknown>; req: PayloadRequest },
): Promise<string | true> => {
  const ids = Array.isArray(values) ? values.map(toID).filter((v) => v !== undefined) : []

  if (ids.length === 0) return 'At least one variant option is required.'

  const productID = toID(data?.product)
  if (productID === undefined) return 'A product is required.'

  const product = await req.payload.findByID({
    id: productID,
    collection: 'products',
    depth: 0,
    req,
    joins: {
      variants: {
        where: {
          deletedAt: { exists: false },
          ...(data?.id ? { id: { not_equals: data.id as OptionID } } : {}),
        },
      },
    },
    select: { variants: true, variantTypes: true },
  })

  const variantTypeCount = Array.isArray(product?.variantTypes) ? product.variantTypes.length : 0
  if (ids.length < variantTypeCount) {
    return 'Every variant type on the product needs an option.'
  }

  const siblings = (product?.variants?.docs ?? []).filter(
    (v): v is Exclude<typeof v, OptionID> => typeof v === 'object' && v !== null,
  )

  const wanted = new Set(ids.map(String))
  const duplicate = siblings.some((variant) => {
    const combo = (variant.options ?? []).map(toID).filter((v) => v !== undefined).map(String)
    return combo.length === wanted.size && combo.every((id) => wanted.has(id))
  })

  if (duplicate) return 'A variant with these options already exists.'

  return true
}

const buildTitle: CollectionBeforeChangeHook = async ({ data, req }) => {
  const optionIDs = Array.isArray(data?.options) ? data.options.map(toID) : []
  const productID = toID(data?.product)

  if (!optionIDs.length || productID === undefined) return data

  const parts: string[] = []

  const product = await req.payload.findByID({
    id: productID,
    collection: 'products',
    depth: 0,
    req,
    select: { title: true },
  })
  if (product?.title) parts.push(product.title)

  for (const id of optionIDs) {
    if (id === undefined) continue
    const option = await req.payload.findByID({
      id,
      collection: 'variantOptions',
      depth: 0,
      req,
      select: { label: true },
    })
    if (option?.label) parts.push(option.label)
  }

  data.title = parts.join(' — ')
  return data
}

export const VariantsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  labels: { singular: 'Variant', plural: 'Variants' },
  admin: {
    ...defaultCollection.admin,
    description: 'Design × phone model. Generated automatically; edit only to override a price.',
    defaultColumns: ['title', 'options', 'priceInUSD', '_status'],
  },
  fields: defaultCollection.fields.map((field): Field => {
    if (field.type === 'relationship' && field.name === 'options') {
      // The default collection is built fresh per call, so mutating is safe and
      // avoids widening the RelationshipField discriminated union via spread.
      field.validate = validateOptions as RelationshipField['validate']
    }
    return field
  }),
  hooks: {
    ...defaultCollection.hooks,
    beforeChange: [buildTitle],
  },
})
