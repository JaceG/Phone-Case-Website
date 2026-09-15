import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { getPayload } from 'payload'
import { chromium } from '@playwright/test'
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
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
let cookie = ''
const headers = () => ({ Cookie: cookie, Origin: base })
async function post(previous: number | null, extra = {}) {
  const form = new FormData()
  form.append(
    'settings',
    JSON.stringify({
      previous,
      model: MODEL.slug,
      placement: DEFAULT,
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
  const secondResponse = await post(first.id, { title: `Studio check ${run} revised` })
  const second = await secondResponse.json()
  assert.equal(secondResponse.status, 201, JSON.stringify(second))
  assert.equal(second.revision, 2)
  assert.equal(second.product, first.product)
  assert.equal(second.originalURL, originalURL)
  assert.equal((await post(first.id)).status, 409)
  const reopened = await (
    await fetch(`${base}/api/catalog-studio?revision=${second.id}`, { headers: headers() })
  ).json()
  assert.deepEqual(reopened.placement, DEFAULT)
  const invalid = await post(second.id, { collection: 99999999 })
  assert.equal(invalid.status, 400)
  const concurrent = await Promise.all([post(second.id), post(second.id)])
  const states = concurrent.map((r) => r.status).sort()
  const bodies = await Promise.all(concurrent.map((r) => r.json()))
  assert.deepEqual(states, [201, 409], JSON.stringify(bodies))
  const third = bodies.find((b) => b.revision === 3)
  const beforePublish = await payload.findByID({
    collection: 'products',
    id: first.product,
    draft: true,
    depth: 0,
  })
  await payload.update({
    collection: 'products',
    id: first.product,
    data: { ...beforePublish, _status: 'published' },
  })
  const fourthResponse = await post(third.id, { title: `Studio check ${run} unpublished edit` })
  assert.equal(fourthResponse.status, 201, JSON.stringify(await fourthResponse.json()))
  const live = await payload.findByID({
    collection: 'products',
    id: first.product,
    draft: false,
    depth: 0,
  })
  assert.equal(live._status, 'published')
  assert.equal(live.title, beforePublish.title)
  console.log(
    'PASS: admin-only API, private unchanged originals, stable product/revisions, reopen, stale/concurrent save rejection, rollback and published-product isolation.',
  )

  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addCookies(
    cookie.split('; ').map((v) => {
      const at = v.indexOf('=')
      return { name: v.slice(0, at), value: v.slice(at + 1), url: base }
    }),
  )
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${base}/catalog-studio`)
  await page.getByLabel('Design title', { exact: true }).waitFor()
  await page
    .locator('input[type=file][accept="image/jpeg,image/png,image/webp"]')
    .setInputFiles(path.join(artifactRoot, 'test-art.png'))
  await page.getByLabel('Design title', { exact: true }).fill(`Studio browser ${run}`)
  await page.getByLabel('Product URL', { exact: false }).fill(`studio-browser-${run}`)
  await page.getByRole('button', { name: 'Back only', exact: false }).click()
  await page.getByRole('button', { name: 'Save catalog draft', exact: true }).first().click()
  await page.getByRole('status').filter({ hasText: 'Draft saved' }).waitFor({ timeout: 60000 })
  const savedList = await (await fetch(`${base}/api/catalog-studio`, { headers: headers() })).json()
  const browserDraft = savedList.drafts.find(
    (d: { title: string }) => d.title === `Studio browser ${run}`,
  )
  assert(browserDraft)
  const exportedBytes = await (
    await fetch(base + browserDraft.printURL, { headers: headers() })
  ).arrayBuffer()
  const exported = await sharp(Buffer.from(exportedBytes)).metadata()
  assert.equal(exported.width, 770)
  assert.equal(exported.height, 1610)
  await page.screenshot({ path: path.join(artifactRoot, 'catalog-desktop.png'), fullPage: true })
  await page.reload()
  await page.getByLabel('Open saved catalog draft').selectOption(String(browserDraft.id))
  await page
    .getByRole('status')
    .filter({ hasText: 'placement are restored' })
    .waitFor({ timeout: 30000 })
  assert.equal(
    await page.getByLabel('Design title', { exact: true }).inputValue(),
    browserDraft.title,
  )
  await page.getByLabel('Image width', { exact: true }).fill('95')
  await page.getByRole('button', { name: 'Save catalog draft', exact: true }).first().click()
  await page.getByRole('status').filter({ hasText: 'revision 2' }).waitFor({ timeout: 60000 })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: path.join(artifactRoot, 'catalog-mobile.png'), fullPage: true })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  await page.goto(`${base}/catalog-studio/models`)
  await page.getByRole('heading', { name: 'Case model review', exact: true }).waitFor()
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('figure img')].length === 8 &&
      [...document.querySelectorAll('figure img')].every(
        (img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
      ),
  )
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: path.join(artifactRoot, 'model-review.png'), fullPage: true })
  assert.equal((await fetch(`${base}/catalog-studio/models`, { redirect: 'manual' })).status, 307)
  assert.deepEqual(errors, [])
  console.log(
    'PASS: browser upload, metadata, back-only export, save, reload/reopen, revision update, mobile width and no uncaught browser errors.',
  )
} finally {
  await browser?.close()
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
