/** Snapshot already-approved geometry for the public derivative builder. Does not approve anything. */
import 'dotenv/config'
import fs from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })
try {
  const [phones, reviews] = await Promise.all([
    payload.find({ collection: 'phoneModels', depth: 0, pagination: false }),
    payload.find({
      collection: 'caseBlanks',
      depth: 0,
      pagination: false,
      where: {
        and: [
          { previewStatus: { equals: 'approved' } },
          { cameraCoverage: { equals: 'fineHoles' } },
        ],
      },
    }),
  ])
  const models = reviews.docs.flatMap((review) => {
    const id = typeof review.phoneModel === 'object' ? review.phoneModel.id : review.phoneModel
    const phone = phones.docs.find((entry) => entry.id === id)
    if (!phone?.slug || !['apple', 'samsung'].includes(phone.brand)) return []
    if (!review.geometry || !review.geometryVersion)
      throw new Error(`Missing geometry: ${phone.slug}`)
    return [
      {
        slug: phone.slug,
        name: phone.name,
        phoneId: id,
        reviewId: review.id,
        version: review.geometryVersion,
        geometry: review.geometry,
      },
    ]
  })
  if (new Set(models.map((m) => m.phoneId)).size !== models.length)
    throw new Error(
      'Multiple approved blanks for one phone: choose the storefront blank explicitly first.',
    )
  await fs.mkdir('pipeline/out/storefront', { recursive: true })
  await fs.writeFile(
    'pipeline/out/storefront/approved.json',
    JSON.stringify(models, null, 2) + '\n',
  )
  console.log(`Exported ${models.length} approved geometry snapshots; review decisions unchanged.`)
} finally {
  await payload.destroy()
}
process.exit(0)
