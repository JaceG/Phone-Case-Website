import 'dotenv/config'
import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Cart } from '@/payload-types'

if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)
)
  throw new Error('Run this draft check against the local database only.')
const payload = await getPayload({ config })
let cartID: number | undefined
try {
  const { docs: products } = await payload.find({
    collection: 'products',
    where: { slug: { in: ['meridian', 'static-bloom', 'low-tide'] } },
    depth: 0,
    pagination: false,
  })
  const choices = await Promise.all(
    products.map(async (product) => {
      const { docs } = await payload.find({
        collection: 'variants',
        where: { product: { equals: product.id } },
        depth: 0,
        limit: 2,
      })
      return { product, variants: docs }
    }),
  )
  const meridian = choices.find((choice) => choice.product.slug === 'meridian')!
  const bloom = choices.find((choice) => choice.product.slug === 'static-bloom')!
  const tide = choices.find((choice) => choice.product.slug === 'low-tide')!
  const created = await payload.create({
    collection: 'carts',
    data: {
      currency: 'USD',
      items: [{ product: meridian.product.id, variant: meridian.variants[0].id, quantity: 1 }],
      subtotal: 1,
    },
    depth: 0,
  })
  cartID = created.id
  assert.equal(created.subtotal, meridian.variants[0].priceInUSD)
  for (const [quantity, total] of [
    [2, 7800],
    [3, 5000],
    [4, 8900],
    [6, 10000],
  ]) {
    const updated: Cart = await payload.update({
      collection: 'carts',
      id: cartID,
      data: {
        items: [{ product: meridian.product.id, variant: meridian.variants[0].id, quantity }],
        subtotal: 1,
      },
      depth: 0,
    })
    assert.equal(updated.subtotal, total)
    console.log(`${quantity} repeated cases => ${updated.subtotal} cents`)
  }
  const mixed = await payload.update({
    collection: 'carts',
    id: cartID,
    data: {
      items: [
        { product: meridian.product.id, variant: meridian.variants[0].id, quantity: 1 },
        { product: bloom.product.id, variant: bloom.variants[1].id, quantity: 1 },
        { product: tide.product.id, variant: tide.variants[0].id, quantity: 1 },
      ],
    },
    depth: 0,
  })
  assert.equal(mixed.subtotal, 5000)
  assert.equal(mixed.items?.length, 3)
  const partial = await payload.update({
    collection: 'carts',
    id: cartID,
    data: { subtotal: 1 },
    depth: 0,
  })
  assert.equal(partial.subtotal, 5000)
  await assert.rejects(
    payload.update({
      collection: 'carts',
      id: cartID,
      data: {
        items: [{ product: meridian.product.id, variant: bloom.variants[0].id, quantity: 3 }],
      },
    }),
  )
  await assert.rejects(
    payload.update({
      collection: 'carts',
      id: cartID,
      data: {
        items: [{ product: meridian.product.id, variant: meridian.variants[0].id, quantity: -1 }],
      },
    }),
  )
  const empty = await payload.update({
    collection: 'carts',
    id: cartID,
    data: { items: [] },
    depth: 0,
  })
  assert.equal(empty.subtotal, 0)
  console.log(
    'PASS: mixed designs and phone models, saved totals, subtotal tampering, variant mismatch, invalid quantity, and empty cart.',
  )
} finally {
  if (cartID !== undefined) await payload.delete({ collection: 'carts', id: cartID })
  await payload.destroy()
}
