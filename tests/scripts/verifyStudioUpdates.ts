import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { DEFAULT, MODEL } from '../../src/components/case-studio/artwork'
import { emptyDetails } from '../../src/lib/studio/contract'

const base = process.env.STUDIO_TEST_ORIGIN || 'http://localhost:3000'
const payload = await getPayload({ config })
const run = randomUUID()
const email = `studio-check-${run}@example.test`
const password = randomUUID() + randomUUID()
const user = await payload.create({
  collection: 'users',
  data: { email, password, roles: ['admin'] },
})
const artifactRoot = path.join(process.cwd(), 'placeholder/studio-verification')
await fs.mkdir(artifactRoot, { recursive: true })
const source = await sharp({
  create: { width: 800, height: 1000, channels: 3, background: '#ad362e' },
})
  .png()
  .toBuffer()
const print = await sharp(source)
  .resize(1070, 1910, { fit: 'contain', background: '#171719' })
  .png()
  .toBuffer()
await fs.writeFile(path.join(artifactRoot, 'test-art.png'), source)
let cookie = ''
const headers = () => ({ Cookie: cookie, Origin: base })
async function post(
  previous: number | null,
  extra = {},
  placement = DEFAULT,
  modelSettings?: unknown,
) {
  const form = new FormData()
  form.append(
    'settings',
    JSON.stringify({
      previous,
      model: MODEL.slug,
      placement,
      modelSettings,
      details: {
        ...emptyDetails,
        title: `Studio check ${run}`,
        slug: `studio-check-${run}`,
        ...extra,
      },
    }),
  )
  const meta = await (await fetch(`${base}/api/catalog-studio`, { headers: headers() })).json()
  form.append('geometryVersion', meta.geometryVersion)
  form.append('original', new Blob([source]), 'original.png')
  form.append('print', new Blob([print]), 'print.png')
  return fetch(`${base}/api/catalog-studio`, { method: 'POST', headers: headers(), body: form })
}
try {
  assert.equal((await fetch(`${base}/api/catalog-studio`)).status, 403)
  assert.equal((await fetch(`${base}/api/catalog-studio`, { method: 'POST' })).status, 403)
  const login = await fetch(`${base}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(login.status, 200)
  cookie = login.headers
    .getSetCookie()
    .map((v) => v.split(';')[0])
    .join('; ')
  assert(cookie)
  assert.equal(
    (
      await fetch(`${base}/api/catalog-studio`, {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'https://example.invalid' },
      })
    ).status,
    403,
  )
  assert.equal(
    (
      await fetch(`${base}/api/studioRevisions`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: '{}',
      })
    ).status,
    403,
  )
  const firstResponse = await post(null)
  const first = await firstResponse.json()
  assert.equal(firstResponse.status, 201, JSON.stringify(first))
  assert.equal(first.revision, 1)
  const originalURL = first.originalURL
  const bytes = Buffer.from(
    await (await fetch(base + originalURL, { headers: headers() })).arrayBuffer(),
  )
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    createHash('sha256').update(source).digest('hex'),
  )
  assert.equal((await fetch(base + originalURL)).status, 403)
  const anonymous = await (
    await fetch(`${base}/api/products?where[id][equals]=${first.product}`)
  ).json()
  assert.equal(anonymous.totalDocs, 0)
  const counts = async () => ({
    revisions: (
      await payload.count({
        collection: 'studioRevisions',
        where: { savedBy: { equals: user.id } },
      })
    ).totalDocs,
    artwork: (await payload.count({ collection: 'artwork' })).totalDocs,
  })
  await payload.update({
    collection: 'products',
    id: first.product,
    draft: true,
    data: { renderStatus: 'ready' },
  })
  const beforeNoop = await payload.findByID({
    collection: 'products',
    id: first.product,
    draft: true,
    depth: 0,
  })
  const initialCounts = await counts()
  const unchangedResponse = await post(first.id)
  const unchanged = await unchangedResponse.json()
  assert.equal(unchangedResponse.status, 201, JSON.stringify(unchanged))
  assert.equal(unchanged.id, first.id)
  assert.equal(unchanged.unchanged, true)
  assert.deepEqual(
    await counts(),
    initialCounts,
    'No-op save must not upload artwork or create history',
  )
  const afterNoop = await payload.findByID({
    collection: 'products',
    id: first.product,
    draft: true,
    depth: 0,
  })
  assert.equal(
    afterNoop.renderStatus,
    'ready',
    'An unchanged save must preserve generated previews',
  )
  assert.equal(afterNoop.updatedAt, beforeNoop.updatedAt)
  const changed = { title: `Studio check ${run} updated` }
  const secondResponse = await post(first.id, changed)
  const second = await secondResponse.json()
  assert.equal(secondResponse.status, 201, JSON.stringify(second))
  assert.equal(second.product, first.product)
  assert.equal(second.revision, 2)
  assert.equal(second.originalURL, first.originalURL)
  const updatedCounts = await counts()
  const retryResponse = await post(first.id, changed)
  const retry = await retryResponse.json()
  assert.equal(retryResponse.status, 201, JSON.stringify(retry))
  assert.equal(
    retry.id,
    second.id,
    'Retry after losing the response must return the same saved design',
  )
  assert.deepEqual(await counts(), updatedCounts)
  assert.equal((await post(first.id, { title: 'Different stale edit' })).status, 409)
  for (const query of [`product=${first.product}`, `revision=${first.id}`]) {
    const response = await fetch(`${base}/api/catalog-studio?${query}`, { headers: headers() })
    const opened = await response.json()
    assert.equal(response.status, 200)
    assert.equal(opened.id, second.id, 'Old links must open the latest saved state')
    assert.equal(opened.title, changed.title)
  }
  const list = await (await fetch(`${base}/api/catalog-studio`, { headers: headers() })).json()
  assert.equal(
    list.drafts.filter((d: { product: number }) => d.product === first.product).length,
    1,
  )
  assert.equal((await fetch(`${base}/catalog-studio/designs`, { redirect: 'manual' })).status, 307)
  const concurrent = await Promise.all([
    post(second.id, { title: `Studio check ${run} race A` }),
    post(second.id, { title: `Studio check ${run} race B` }),
  ])
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409])
  assert.equal((await counts()).revisions, 3)
  const latest = (
    await payload.find({
      collection: 'studioRevisions',
      where: { product: { equals: first.product } },
      depth: 0,
      sort: '-revision',
      limit: 1,
    })
  ).docs[0]
  const adjusted = { ...DEFAULT, x: DEFAULT.x + 20, width: DEFAULT.width * 1.1 }
  const placementResponse = await post(latest.id, latest.details as object, adjusted)
  const placed = await placementResponse.json()
  assert.equal(placementResponse.status, 201, JSON.stringify(placed))
  assert.deepEqual(placed.placement, adjusted)
  assert.equal(placed.product, first.product)
  assert.equal(placed.revision, 4)
  assert.equal(
    (await payload.findByID({ collection: 'products', id: first.product, draft: true, depth: 0 }))
      .renderStatus,
    'pending',
  )
  const phoneList = await (
    await fetch(`${base}/api/catalog-studio/render`, { headers: headers() })
  ).json()
  const apple = phoneList.models.find((m: { brand: string }) => m.brand === 'apple')
  const samsung = phoneList.models.find((m: { brand: string }) => m.brand === 'samsung')
  assert(apple && samsung, 'Need approved iPhone and Samsung examples')
  const { adaptPlacement } = await import('../../src/lib/studio-publish/placement')
  const fits = {
    phones: [apple.id, samsung.id],
    placements: {
      [apple.id]: {
        version: apple.version,
        placement: { ...adaptPlacement(adjusted, apple.params), rotation: 12 },
      },
      [samsung.id]: {
        version: samsung.version,
        placement: { ...adaptPlacement(adjusted, samsung.params), rotation: -8, printMode: 'back' },
      },
    },
  }
  const fitsResponse = await post(placed.id, latest.details as object, adjusted, fits)
  const fitted = await fitsResponse.json()
  assert.equal(fitsResponse.status, 201, JSON.stringify(fitted))
  assert.equal(fitted.product, first.product)
  assert.deepEqual(fitted.placement, adjusted)
  assert.deepEqual(fitted.modelSettings.placements, fits.placements)
  const reopened = await (
    await fetch(`${base}/api/catalog-studio?product=${first.product}`, { headers: headers() })
  ).json()
  assert.deepEqual(
    reopened.modelSettings,
    fitted.modelSettings,
    'Both custom fits survive reopening',
  )
  const noOpFits = await post(fitted.id, latest.details as object, adjusted, fitted.modelSettings)
  assert.equal(
    (await noOpFits.json()).id,
    fitted.id,
    'Unchanged model fits reuse the saved revision',
  )
  const obsolete = structuredClone(fits)
  obsolete.placements[apple.id].version = 'obsolete-version'
  assert.equal((await post(fitted.id, latest.details as object, adjusted, obsolete)).status, 400)
  const withoutApple = { ...fitted.modelSettings, phones: [samsung.id] }
  const selectionResponse = await post(fitted.id, latest.details as object, adjusted, withoutApple)
  const selectionSaved = await selectionResponse.json()
  assert.equal(selectionResponse.status, 201, JSON.stringify(selectionSaved))
  assert.deepEqual(selectionSaved.modelSettings.phones, [samsung.id])
  assert.deepEqual(
    selectionSaved.modelSettings.placements,
    fits.placements,
    'Excluding a phone does not discard its crop',
  )
  const legacySave = await post(selectionSaved.id, latest.details as object, adjusted)
  assert.equal(
    (await legacySave.json()).id,
    selectionSaved.id,
    'An older client cannot erase existing model fits',
  )
  console.log(
    'PASS: authenticated design access, unchanged saves create no records/files, retries return the same save, edits keep one product, legacy links open latest, one library entry, competing edits cannot overwrite each other, and per-phone fits persist, deduplicate, preserve excluded crops and reject stale geometry.',
  )
} finally {
  const revisions = await payload.find({
    collection: 'studioRevisions',
    where: { savedBy: { equals: user.id } },
    pagination: false,
    depth: 0,
  })
  const products = new Set(
    revisions.docs.map((r) => (typeof r.product === 'number' ? r.product : r.product.id)),
  )
  const artworks = new Set(
    revisions.docs
      .flatMap((r) => [r.original, r.printMaster])
      .map((r) => (typeof r === 'number' ? r : r.id)),
  )
  const previews = revisions.docs
    .map((r) => r.preview)
    .filter(Boolean)
    .map((r) => (typeof r === 'number' ? r : r!.id))
  await payload.delete({ collection: 'studioRevisions', where: { savedBy: { equals: user.id } } })
  for (const id of products) {
    await payload.delete({ collection: 'variants', where: { product: { equals: id } } })
    await payload.delete({ collection: 'products', id })
  }
  for (const id of artworks) await payload.delete({ collection: 'artwork', id })
  for (const id of previews) await payload.delete({ collection: 'productionAssets', id })
  await payload.delete({ collection: 'users', id: user.id })
  await payload.destroy()
}

process.exit(0)
