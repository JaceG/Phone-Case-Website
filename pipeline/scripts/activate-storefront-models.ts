/** Connect already-approved, exported previews to the review-stage shopping flow.
 * Does not approve models, validate samples, publish designs, or enable payments.
 */
import 'dotenv/config'
import fs from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  approvedModelVersions,
  modelAssets,
  hasCurrentApproval,
} from '@/lib/storefront/approvedModels'

const payload = await getPayload({ config })
try {
  const approvals = await approvedModelVersions(payload)
  const phones = await payload.find({ collection: 'phoneModels', depth: 0, pagination: false })
  const target = phones.docs.filter((phone) => {
    const asset = modelAssets[phone.slug ?? '']
    return (
      ['apple', 'samsung'].includes(phone.brand) &&
      hasCurrentApproval(asset, approvals.get(phone.id))
    )
  })
  const rank = (slug: string) => {
    const i = /^iphone-(\d+)(.*)$/.exec(slug)
    const suffix = (s: string) =>
      ({
        '-pro': 0,
        '-pro-max': 1,
        '': 2,
        '-plus': 3,
        '-mini': 3,
        e: 4,
        '-ultra': 0,
        '-fe': 4,
        '-edge': 5,
      })[s] ?? 6
    if (i) return (17 - Number(i[1])) * 10 + suffix(i[2])
    if (slug === 'iphone-air') return 8
    if (slug === 'iphone-se-2022') return 70
    if (slug === 'iphone-se-2020') return 71
    const g = /^galaxy-s(\d+)(.*)$/.exec(slug)
    return g ? 100 + (26 - Number(g[1])) * 10 + suffix(g[2]) : 999
  }
  // Validate the entire output set before any model is made selectable.
  for (const phone of target) {
    const asset = modelAssets[phone.slug!]
    if (Object.keys(asset.designs).length !== 3)
      throw new Error(`Incomplete design set: ${phone.slug}`)
    for (const url of [asset.geometry, ...Object.values(asset.designs).flatMap(Object.values)]) {
      if (!url.startsWith('/store/cases/')) throw new Error('Unexpected public derivative path')
      await fs.access(`public${url}`)
    }
  }
  for (const phone of target) {
    await payload.update({
      collection: 'phoneModels',
      id: phone.id,
      depth: 0,
      data: { status: 'active', sortOrder: rank(phone.slug!) },
    })
  }
  console.log(
    `Connected ${target.length} approved phone models. Samples, payments and product publication are unchanged.`,
  )
} finally {
  await payload.destroy()
}
process.exit(0)
