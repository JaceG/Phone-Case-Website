import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import type { CollectionBeforeChangeHook, DefaultDocumentIDType, Field } from 'payload'

/**
 * Override of the plugin's `orders` collection.
 *
 * Every order is printed in-house (UV DTF), so an order doubles as a print
 * job. Two things are added on top of the plugin's fields:
 *
 *   - `fulfillment`: the operator's status flow for the physical job
 *     (queued → printing → printed → qc → packed → shipped) plus carrier
 *     and tracking.
 *   - `printJobs`: a read-only, denormalised list of what to print. One row
 *     per line item: design, phone model, quantity, and a direct link to the
 *     artwork (print master) so the print station never has to walk the
 *     product → artwork graph by hand.
 *
 * `printJobs` is filled in by a beforeChange hook on create, or on update if
 * it is still empty. Everything the hook looks up goes through `req` so it
 * stays inside the caller's transaction on Postgres. No `context` flags are
 * used (Payload merges nested `context` into the shared request).
 */

export const PRINT_STATUSES = [
  { label: 'Queued', value: 'queued' },
  { label: 'Printing', value: 'printing' },
  { label: 'Printed', value: 'printed' },
  { label: 'QC', value: 'qc' },
  { label: 'Packed', value: 'packed' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Cancelled', value: 'cancelled' },
] as const

export type PrintStatus = (typeof PRINT_STATUSES)[number]['value']

const idOf = (value: unknown): DefaultDocumentIDType | undefined => {
  if (value && typeof value === 'object' && 'id' in value) {
    return (value as { id: DefaultDocumentIDType }).id
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value as DefaultDocumentIDType
  }
  return undefined
}

type OrderItem = { product?: unknown; variant?: unknown; quantity?: number }

type PrintJobRow = {
  designTitle: string
  designSlug?: string
  phoneModel?: string
  quantity: number
  artwork?: DefaultDocumentIDType
  variant?: DefaultDocumentIDType
}

/**
 * Resolves each order item to a print job row. Exported so the seed (or a
 * future backfill script) can reuse it.
 */
export const buildPrintJobs = async ({
  items,
  req,
}: {
  items: OrderItem[]
  req: Parameters<CollectionBeforeChangeHook>[0]['req']
}): Promise<PrintJobRow[]> => {
  const { payload } = req
  const rows: PrintJobRow[] = []

  for (const item of items) {
    const productID = idOf(item.product)
    const variantID = idOf(item.variant)
    if (productID === undefined) continue

    const product = await payload.findByID({
      collection: 'products',
      id: productID,
      depth: 0,
      req,
      select: { title: true, slug: true, artwork: true },
    })
    if (!product) continue

    let phoneModel: string | undefined

    if (variantID !== undefined) {
      // depth 1 populates `options` → variantOptions, whose label is the
      // phone model's customer-facing name (mirrored from `phoneModels`).
      const variant = await payload.findByID({
        collection: 'variants',
        id: variantID,
        depth: 1,
        req,
        select: { options: true },
      })
      const labels = (variant?.options ?? [])
        .map((option) =>
          option && typeof option === 'object' && 'label' in option ? option.label : undefined,
        )
        .filter((label): label is string => typeof label === 'string')
      if (labels.length) phoneModel = labels.join(' / ')
    }

    rows.push({
      designTitle: product.title,
      designSlug: product.slug ?? undefined,
      phoneModel,
      quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
      artwork: idOf(product.artwork),
      variant: variantID,
    })
  }

  return rows
}

const populatePrintJobs: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const incoming = Array.isArray(data?.printJobs) ? data.printJobs : []
  const existing = Array.isArray(originalDoc?.printJobs) ? originalDoc.printJobs : []

  // Only (re)build when there is nothing yet. Rows are read-only in the admin
  // so a manual edit can't clear them; an empty array here means a fresh
  // order or one created before this field existed.
  if (operation === 'update' && (incoming.length > 0 || existing.length > 0)) {
    if (incoming.length === 0) data.printJobs = existing
    return data
  }

  const items: OrderItem[] = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(originalDoc?.items)
      ? originalDoc.items
      : []

  if (items.length === 0) return data

  data.printJobs = await buildPrintJobs({ items, req })
  return data
}

const stampStatusTransitions: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const next: PrintStatus | undefined = data?.fulfillment?.printStatus
  const prev: PrintStatus | undefined = originalDoc?.fulfillment?.printStatus

  if (!next || next === prev) return data

  const fulfillment = { ...(originalDoc?.fulfillment ?? {}), ...(data.fulfillment ?? {}) }
  const now = new Date().toISOString()

  if (next === 'printed' && !fulfillment.printedAt) fulfillment.printedAt = now
  if (next === 'shipped' && !fulfillment.shippedAt) fulfillment.shippedAt = now

  data.fulfillment = fulfillment
  return data
}

const accessTokenField: Field = {
  name: 'accessToken',
  type: 'text',
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    readOnly: true,
  },
  hooks: {
    beforeValidate: [
      ({ value, operation }) => {
        if (operation === 'create' || !value) {
          return crypto.randomUUID()
        }
        return value
      },
    ],
  },
}

const fulfillmentField: Field = {
  name: 'fulfillment',
  type: 'group',
  admin: {
    description: 'The physical job. Print status drives the print queue; the rest is for the label.',
  },
  fields: [
    {
      name: 'printStatus',
      type: 'select',
      // Not `required`: that would make the whole group required in the
      // generated Order type and break the template's account page, which
      // builds Order literals. The default still applies on create.
      defaultValue: 'queued',
      index: true,
      options: [...PRINT_STATUSES],
      admin: {
        position: 'sidebar',
        description: 'Printed and Shipped stamp their dates automatically.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'printedAt',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'shippedAt',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'carrier', type: 'text' },
        { name: 'trackingNumber', type: 'text' },
      ],
    },
    { name: 'trackingUrl', type: 'text', label: 'Tracking URL' },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Operator notes: reprints, defects, anything the label needs.' },
    },
  ],
}

const printJobsField: Field = {
  name: 'printJobs',
  type: 'array',
  label: 'Print jobs',
  admin: {
    readOnly: true,
    initCollapsed: false,
    description:
      'Generated from the order items when the order is created. What to print, on which blank, and the print master to print from.',
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'designTitle', type: 'text', required: true },
        { name: 'designSlug', type: 'text' },
        { name: 'phoneModel', type: 'text' },
        { name: 'quantity', type: 'number', required: true, min: 1, defaultValue: 1 },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'artwork',
          type: 'relationship',
          relationTo: 'artwork',
          admin: { description: 'The print master.' },
        },
        { name: 'variant', type: 'relationship', relationTo: 'variants' },
      ],
    },
  ],
}

export const OrdersCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  admin: {
    ...defaultCollection.admin,
    group: 'Fulfillment',
    defaultColumns: ['id', 'createdAt', 'customer', 'fulfillment.printStatus', 'amount'],
    description:
      'Every order is a print job. Work the queue from Print queue in the nav; update Print status here as the job moves.',
  },
  fields: [...defaultCollection.fields, printJobsField, fulfillmentField, accessTokenField],
  hooks: {
    ...defaultCollection.hooks,
    beforeChange: [
      ...(defaultCollection.hooks?.beforeChange ?? []),
      populatePrintJobs,
      stampStatusTransitions,
    ],
  },
})
