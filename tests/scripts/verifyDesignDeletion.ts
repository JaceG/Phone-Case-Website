/** Run against the local development server. All records belong to a disposable admin. */
import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { createLocalReq, getPayload } from 'payload'
import config from '../../src/payload.config'
import { saveStudio, geometryVersion, idOf } from '../../src/lib/studio/save'
import { DEFAULT, MODEL } from '../../src/components/case-studio/artwork'
import { emptyDetails } from '../../src/lib/studio/contract'

const base = process.env.STUDIO_TEST_ORIGIN || 'http://localhost:3000'
const payload = await getPayload({ config })
const run = randomUUID()
const password = randomUUID() + randomUUID()
const user = await payload.create({
  collection: 'users',
  data: { email: `delete-check-${run}@example.test`, password, roles: ['admin'] },
})
const products = new Set<number>(),
  artworks = new Set<number>()
const source = await sharp({
  create: { width: 200, height: 300, channels: 3, background: '#50613c' },
})
  .png()
  .toBuffer()
const print = await sharp(source).resize(1070, 1910).png().toBuffer()
const geometry = await geometryVersion()
const request = () => createLocalReq({ user }, payload)
async function fixture(label: string) {
  const form = new FormData()
  form.append(
    'settings',
    JSON.stringify({
      previous: null,
      model: MODEL.slug,
      placement: DEFAULT,
      details: {
        ...emptyDetails,
        title: `Delete check ${label}`,
        slug: `delete-check-${run}-${label}`,
      },
    }),
  )
  form.append('geometryVersion', geometry)
  form.append('original', new Blob([source]), 'original.png')
  form.append('print', new Blob([print]), 'print.png')
  const saved = await saveStudio(form, await request())
  products.add(saved.product)
  const revision = await payload.findByID({ collection: 'studioRevisions', id: saved.id, depth: 0 })
  artworks.add(idOf(revision.original))
  artworks.add(idOf(revision.printMaster))
  const option = (await payload.find({ collection: 'variantOptions', limit: 1, depth: 0 })).docs[0]
  assert(option, 'An existing phone option is required for this test')
  const variant = await payload.create({
    collection: 'variants',
    draft: true,
    data: { product: saved.product, options: [option.id], priceInUSD: 3900 },
    req: await request(),
  })
  return { ...saved, variant: variant.id }
}
const countHistory = async (product: number) =>
  (await payload.count({ collection: 'studioRevisions', where: { product: { equals: product } } }))
    .totalDocs
try {
  const login = await fetch(`${base}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password }),
  })
  assert.equal(login.status, 200)
  const cookie = login.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
  const headers = { Cookie: cookie, 'Content-Type': 'application/json' }
  const first = await fixture('single')
  assert.equal(
    (await fetch(`${base}/api/products/${first.product}`, { method: 'DELETE' })).status,
    403,
  )
  const response = await fetch(`${base}/api/products/${first.product}`, {
    method: 'DELETE',
    headers,
  })
  assert.equal(response.status, 200, await response.text())
  assert.equal(await countHistory(first.product), 0)
  assert.equal(
    (
      await payload.count({
        collection: 'variants',
        trash: true,
        where: { product: { equals: first.product } },
      })
    ).totalDocs,
    0,
  )
  assert.equal(
    (await fetch(`${base}/api/catalog-studio?revision=${first.id}`, { headers })).status,
    404,
  )
  for (const id of artworks)
    assert(
      (await payload.findByID({ collection: 'artwork', id })).id,
      'Source and print assets remain available to other references',
    )

  const trashed = await fixture('trash')
  const trashResponse = await fetch(`${base}/api/products/${trashed.product}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ deletedAt: new Date().toISOString() }),
  })
  assert.equal(trashResponse.status, 200, await trashResponse.text())
  assert.equal(await countHistory(trashed.product), 1, 'Trash must retain history for restoration')
  const list = await (await fetch(`${base}/api/catalog-studio`, { headers })).json()
  assert(
    !list.drafts.some((d: { product: number }) => d.product === trashed.product),
    'Trashed designs must be hidden in Studio',
  )
  assert.equal(
    (await fetch(`${base}/api/catalog-studio?product=${trashed.product}`, { headers })).status,
    404,
  )
  const restored = await fetch(`${base}/api/products/${trashed.product}?trash=true`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ deletedAt: null }),
  })
  assert.equal(restored.status, 200, await restored.text())
  assert.equal(
    (await fetch(`${base}/api/catalog-studio?product=${trashed.product}`, { headers })).status,
    200,
  )
  // Include a trashed variant when the parent is permanently deleted from Trash.
  await payload.update({
    collection: 'variants',
    id: trashed.variant,
    data: { deletedAt: new Date().toISOString() },
  })
  await payload.update({
    collection: 'products',
    id: trashed.product,
    data: { deletedAt: new Date().toISOString() },
  })
  const purge = await fetch(`${base}/api/products/${trashed.product}?trash=true`, {
    method: 'DELETE',
    headers,
  })
  assert.equal(purge.status, 200, await purge.text())
  assert.equal(await countHistory(trashed.product), 0)
  assert.equal(
    (
      await payload.count({
        collection: 'variants',
        trash: true,
        where: { product: { equals: trashed.product } },
      })
    ).totalDocs,
    0,
  )

  const bulkA = await fixture('bulk-a'),
    bulkB = await fixture('bulk-b')
  const bulk = await fetch(`${base}/api/products?where[id][in]=${bulkA.product},${bulkB.product}`, {
    method: 'DELETE',
    headers,
  })
  const result = await bulk.json()
  assert.equal(bulk.status, 200, JSON.stringify(result))
  assert.equal(result.errors.length, 0)
  assert.equal(result.docs.length, 2)
  assert.equal(await countHistory(bulkA.product), 0)
  assert.equal(await countHistory(bulkB.product), 0)

  const rollback = await fixture('rollback')
  const hooks = payload.collections.products.config.hooks.beforeDelete
  const fail = () => {
    throw new Error('Deliberate rollback check')
  }
  hooks.push(fail)
  try {
    await assert.rejects(
      payload.delete({ collection: 'products', id: rollback.product, req: await request() }),
      /Deliberate rollback check/,
    )
  } finally {
    hooks.splice(hooks.indexOf(fail), 1)
  }
  assert.equal(
    await countHistory(rollback.product),
    1,
    'A failed parent deletion must restore its history',
  )
  assert.equal(
    (await payload.findByID({ collection: 'variants', id: rollback.variant })).id,
    rollback.variant,
  )
  assert.equal(
    (await payload.findByID({ collection: 'products', id: rollback.product })).id,
    rollback.product,
  )
  console.log(
    'PASS: permanent and bulk deletion, trashed variants, private access, trash/restore, editor filtering, retained assets, and transactional rollback.',
  )
} finally {
  // Limit cleanup to this run, including when the regression reproduces before the fix.
  for (const id of products) {
    await payload.delete({ collection: 'studioRevisions', where: { product: { equals: id } } })
    await payload.delete({
      collection: 'variants',
      trash: true,
      where: { product: { equals: id } },
    })
    await payload.delete({ collection: 'products', trash: true, where: { id: { equals: id } } })
  }
  for (const id of artworks) await payload.delete({ collection: 'artwork', id })
  await payload.delete({ collection: 'users', id: user.id })
  await payload.destroy()
}
process.exit(0)
