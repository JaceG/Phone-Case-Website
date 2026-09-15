import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { getPayload, createLocalReq } from 'payload'
import { chromium } from '@playwright/test'
import config from '../../src/payload.config'
import { importPackage } from '../../pipeline/scripts/model-review-batch'

const base = process.env.STUDIO_TEST_ORIGIN || 'http://localhost:3000'
const payload = await getPayload({ config })
const run = randomUUID()
const batch = `Review test ${run}`
const email = `model-check-${run}@example.test`
const password = randomUUID() + randomUUID()
const user = await payload.create({
  collection: 'users',
  data: { email, password, roles: ['admin'] },
})
const root = path.resolve('placeholder/model-review-verification')
await fs.mkdir(root, { recursive: true })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const created: number[] = []
const assets: number[] = []
try {
  assert.equal((await fetch(base + '/api/model-review')).status, 403)
  assert.equal((await fetch(base + '/api/model-review', { method: 'POST' })).status, 403)
  const login = await fetch(base + '/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(login.status, 200)
  const cookie = login.headers
    .getSetCookie()
    .map((v) => v.split(';')[0])
    .join('; ')
  const headers = { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' }
  const post = (data: unknown) =>
    fetch(base + '/api/model-review', { method: 'POST', headers, body: JSON.stringify(data) })
  const list = async () =>
    (await (await fetch(base + '/api/model-review', { headers })).json()).models
  assert.equal(
    (
      await fetch(base + '/api/model-review', {
        method: 'POST',
        headers: { ...headers, Origin: 'https://example.invalid' },
        body: '{}',
      })
    ).status,
    403,
  )
  const phones = await payload.find({
    collection: 'phoneModels',
    pagination: false,
    depth: 0,
    sort: 'name',
  })
  const ps = phones.docs.slice(0, 3)
  let res = await post({ action: 'queue', batch, phoneIds: ps.map((p) => p.id) })
  assert.equal(res.status, 201)
  const queued = await res.json()
  assert.equal(queued.created.length, 3)
  created.push(...queued.created)
  res = await post({ action: 'queue', batch, phoneIds: ps.map((p) => p.id) })
  assert.equal((await res.json()).existing.length, 3)
  const initial = (await list()).filter((m: any) => created.includes(m.id))
  const q = initial[0]
  assert.equal(
    (
      await post({
        action: 'decision',
        id: q.id,
        updatedAt: q.updatedAt,
        version: q.version,
        status: 'approved',
        feedback: '',
      })
    ).status,
    400,
  )
  const fixture = path.join(root, 'test-shape.png')
  await sharp({ create: { width: 400, height: 700, channels: 3, background: '#b5bea2' } })
    .png()
    .toFile(fixture)
  const packages = []
  for (const m of initial.slice(0, 2)) {
    const geometryFile = `${m.slug}.json`
    await fs.writeFile(
      path.join(root, geometryFile),
      JSON.stringify({ slug: m.slug, testOnly: true, holes: 6 }),
    )
    const entry = {
      id: m.id,
      slug: m.slug,
      expectedUpdatedAt: m.updatedAt,
      geometryFile,
      notes: 'Synthetic test fixture, not a real model.',
      cameraCoverage: 'fineHoles' as const,
      images: [
        { caption: 'Neutral shell', file: 'test-shape.png' },
        { caption: 'Camera detail', file: 'test-shape.png' },
      ],
      references: [
        {
          title: 'Test finished case reference',
          url: 'https://example.com/case',
          kind: 'finishedCase' as const,
          notes: 'Test only',
        },
      ],
    }
    const imported = await importPackage(entry, root, await createLocalReq({}, payload))
    assert.equal(imported.result, 'ready for review')
    packages.push(entry)
  }
  let model = (await list()).find((m: any) => m.id === q.id)
  res = await post({
    action: 'decision',
    id: model.id,
    updatedAt: model.updatedAt,
    version: model.version,
    status: 'approved',
    feedback: 'Test approval',
  })
  assert.equal(res.status, 200)
  let saved = await res.json()
  assert.equal(saved.status, 'approved')
  assert.equal(saved.sample, 'pending')
  assert(saved.history.some((h: any) => h.status === 'approved'))
  const unchanged = await importPackage(
    packages.find((p) => p.id === q.id)!,
    root,
    await createLocalReq({}, payload),
  )
  assert.match(unchanged.result, /unchanged/)
  assert.equal((await list()).find((m: any) => m.id === q.id).status, 'approved')
  assert.equal(
    (
      await post({
        action: 'decision',
        id: model.id,
        updatedAt: model.updatedAt,
        version: model.version,
        status: 'rejected',
        feedback: 'Stale',
      })
    ).status,
    409,
  )
  // Racing decisions must serialize; only one may save against the same revision.
  const races = await Promise.all(
    ['note A', 'note B'].map((feedback) =>
      post({
        action: 'decision',
        id: saved.id,
        updatedAt: saved.updatedAt,
        version: saved.version,
        status: 'note',
        feedback,
      }),
    ),
  )
  assert.deepEqual(races.map((r) => r.status).sort(), [200, 409])
  model = (await list()).find((m: any) => m.id === q.id)
  res = await post({
    action: 'decision',
    id: model.id,
    updatedAt: model.updatedAt,
    version: model.version,
    status: 'review',
    feedback: '',
  })
  assert.equal(res.status, 200)
  const latest = (await list()).find((m: any) => m.id === q.id)
  assert.equal(
    (
      await post({
        action: 'decision',
        id: latest.id,
        updatedAt: latest.updatedAt,
        version: latest.version,
        status: 'changes',
        feedback: '',
      })
    ).status,
    400,
  )
  assert.equal((await fetch(base + latest.images[0].url)).status, 403)
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addCookies(
    cookie.split('; ').map((v) => {
      const i = v.indexOf('=')
      return { name: v.slice(0, i), value: v.slice(i + 1), url: base }
    }),
  )
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(base + '/catalog-studio/models')
  await page.getByLabel('Batch', { exact: true }).selectOption(batch)
  assert.equal(await page.locator('.mr-card').count(), 3)
  await page.screenshot({ path: path.join(root, 'dashboard.png'), fullPage: true })
  const ready = (await list()).filter((m: any) => created.includes(m.id) && m.stage === 'ready')
  for (const m of ready)
    await page.getByRole('checkbox', { name: `Select ${m.phone}`, exact: true }).check()
  await page.getByRole('button', { name: 'Compare (2)', exact: true }).click()
  await page.getByRole('dialog', { name: 'Compare case models' }).waitFor()
  assert.equal(await page.locator('.mr-compare article').count(), 2)
  await page.screenshot({ path: path.join(root, 'compare.png') })
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.getByRole('button', { name: `Review ${ready[1].phone}`, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: ready[1].phone, exact: true })
  await dialog.waitFor()
  await dialog
    .getByLabel('Your feedback')
    .fill('Move the camera lip slightly inward — camera detail view.')
  await dialog.getByRole('button', { name: 'Request changes', exact: true }).click()
  await page.waitForFunction(() =>
    document.querySelector('.mr-detail-top')?.textContent?.includes('Changes requested'),
  )
  assert((await list()).find((m: any) => m.id === ready[1].id).feedback.includes('camera lip'))
  await page.screenshot({ path: path.join(root, 'review.png') })
  await dialog.getByRole('button', { name: 'Back to all models' }).click()
  await page.getByLabel('Status', { exact: true }).selectOption('changes')
  assert.equal(await page.locator('.mr-card').count(), 1)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: path.join(root, 'mobile.png'), fullPage: true })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  await page.getByRole('button', { name: `Review ${ready[1].phone}`, exact: true }).click()
  assert(
    await page.evaluate(() => {
      const d = document.querySelector('dialog')!
      return d.scrollWidth <= d.clientWidth + 1
    }),
  )
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.getByRole('button', { name: 'Prepare a batch', exact: false }).click()
  await page.getByLabel('Batch name', { exact: true }).fill(batch)
  await page.getByRole('checkbox', { name: `Queue ${ps[0].name}`, exact: true }).check()
  await page.getByRole('button', { name: 'Queue 1 models', exact: true }).click()
  await page.waitForFunction(() => !document.querySelector('dialog[open]'))
  assert.equal((await list()).filter((m: any) => created.includes(m.id)).length, 3)
  assert.deepEqual(errors, [])
  // New package version invalidates prior decisions for this model only.
  const p = packages[0]
  const before = (await list()).find((m: any) => m.id === p.id)
  await fs.writeFile(
    path.join(root, p.geometryFile),
    JSON.stringify({ slug: p.slug, testOnly: true, holes: 7 }),
  )
  await importPackage(
    { ...p, expectedUpdatedAt: before.updatedAt },
    root,
    await createLocalReq({}, payload),
  )
  const revised = (await list()).find((m: any) => m.id === p.id)
  assert.equal(revised.status, 'review')
  assert.equal(revised.sample, 'pending')
  assert.notEqual(revised.version, before.version)
  assert((await list()).find((m: any) => m.id === ready[1].id).status === 'changes')
  console.log(
    'PASS: private access, batch queue/deduplication, package import/reimport, version invalidation, stale/racing decisions, feedback history, out-of-order review, filters, comparison, mobile and no browser errors.',
  )
} finally {
  await browser?.close()
  const docs = await payload.find({
    collection: 'caseBlanks',
    where: { batch: { equals: batch } },
    pagination: false,
    depth: 0,
  })
  for (const doc of docs.docs) {
    for (const i of doc.reviewImages ?? [])
      assets.push(typeof i.image === 'number' ? i.image : i.image.id)
    await payload.delete({ collection: 'caseBlanks', id: doc.id })
  }
  const uploaded = await payload.find({
    collection: 'productionAssets',
    where: { or: created.map((id) => ({ notes: { contains: `Private model review ${id}:` } })) },
    pagination: false,
    depth: 0,
  })
  for (const asset of uploaded.docs)
    await payload.delete({ collection: 'productionAssets', id: asset.id })
  await payload.delete({ collection: 'users', id: user.id })
  await payload.destroy()
}
process.exit(0)
