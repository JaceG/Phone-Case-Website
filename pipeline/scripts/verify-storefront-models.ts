/** Local integration check: assets, approvals, variants and a disposable mixed-phone cart. */
import 'dotenv/config'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '@payload-config'
import { loadStorefront } from '@/lib/storefront/loadStorefront'
import { modelAssets } from '@/lib/storefront/approvedModels'
import { variantFor, rendersFor } from '@/components/store/catalog'

if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)
)
  throw new Error('Run this check against the local draft database only.')
const payload = await getPayload({ config })
let cartId: number | undefined
try {
  const { catalog, phoneModels } = await loadStorefront()
  assert.equal(phoneModels.length, 44)
  assert.equal(phoneModels.filter((m) => m.brand === 'apple').length, 28)
  assert.equal(phoneModels.filter((m) => m.brand === 'samsung').length, 16)
  assert.deepEqual(catalog.map((d) => d.slug).sort(), ['low-tide', 'meridian', 'static-bloom'])
  let combinations = 0
  for (const model of phoneModels) {
    assert.equal(model.status, 'active')
    const asset = modelAssets[model.slug]
    const glb = await fs.readFile(`public${asset.geometry}`)
    assert.equal(glb.readUInt32LE(0), 0x46546c67)
    const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString())
    assert.ok(gltf.meshes.length > 0)
    assert.ok(!gltf.images?.length, 'Public shell must not embed private artwork')
    for (const design of catalog) {
      const variant = variantFor(design, model)
      assert.ok(variant, `Missing variant ${design.slug}/${model.slug}`)
      assert.equal(variant.price, design.price)
      const renders = rendersFor(design, model)
      assert.equal(renders.geometry, asset.geometry)
      assert.deepEqual(renders.tumble, [])
      for (const url of Object.values(asset.designs[design.slug])) await fs.access(`public${url}`)
      combinations++
    }
  }
  const models = ['iphone-12-mini', 'galaxy-s26-ultra', 'iphone-16e'].map((slug) =>
    phoneModels.find((m) => m.slug === slug)!,
  )
  const items = catalog.map((design, i) => ({
    product: design.id,
    variant: variantFor(design, models[i])!.id,
    quantity: 1,
  }))
  const cart = await payload.create({
    collection: 'carts',
    depth: 0,
    data: { currency: 'USD', items, subtotal: 1 },
  })
  cartId = cart.id
  assert.equal(cart.subtotal, 5000)
  assert.equal(cart.items?.length, 3)
  const six = await payload.update({
    collection: 'carts',
    id: cartId,
    depth: 0,
    data: { items: items.map((item) => ({ ...item, quantity: 2 })), subtotal: 1 },
  })
  assert.equal(six.subtotal, 10000)
  console.log(
    `PASS: ${phoneModels.length} approved models, ${combinations} complete previews/variants, public geometry without embedded originals, mixed-phone sets $50/$100.`,
  )
} finally {
  if (cartId !== undefined) await payload.delete({ collection: 'carts', id: cartId })
  await payload.destroy()
}
process.exit(0)
