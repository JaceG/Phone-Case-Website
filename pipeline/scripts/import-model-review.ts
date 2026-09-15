/** Import the first model's review package without changing storefront availability. */
import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { MODEL } from '../../src/components/case-studio/artwork'
import { geometryVersion } from '../../src/lib/studio/save'

const payload = await getPayload({ config })
try {
  const version = await geometryVersion()
  const referenceKey = `walker-1601927395824-${MODEL.slug}-${version.slice(0, 16)}`
  const existing = await payload.find({
    collection: 'caseBlanks',
    where: { referenceKey: { equals: referenceKey } },
    limit: 1,
  })
  if (existing.docs.length) {
    console.log(
      `Review already exists: /admin/collections/caseBlanks/${existing.docs[0].id}. Existing review decisions preserved.`,
    )
  } else {
    const models = await payload.find({
      collection: 'phoneModels',
      where: { slug: { equals: MODEL.slug } },
      limit: 1,
    })
    if (!models.docs.length)
      throw new Error('Create the matching phone model before importing its review.')
    const images = [
      [
        'Supplier reference — covered camera surround; shared listing photo, not dimensioned CAD',
        '/Users/jace/Downloads/Phone Website Stuff/Phone Case Image Samples/H2032c33018f745fcb1b023a1b16a26b54.jpg_960x960q80.avif',
      ],
      ['Neutral shell — three-quarter', 'pipeline/out/review/lavender/meridian_three_quarter.png'],
      [
        'Camera surround and individual openings',
        'pipeline/out/review/lavender/meridian_detail.png',
      ],
      ['Inside and rim', 'pipeline/out/review/lavender/meridian_interior.png'],
      ['Numbered checker — back placement', 'pipeline/out/review/checker/meridian_flat.png'],
      ['Numbered checker — angle', 'pipeline/out/review/checker/meridian_three_quarter.png'],
      ['Side coverage', 'pipeline/out/refined/meridian_turntable_006.png'],
      ['Presentation artwork — angle', 'pipeline/out/presentation/meridian_three_quarter.png'],
    ]
    // Resolve all prerequisites before creating any records.
    const prepared = await Promise.all(
      images.map(async ([caption, file]) => ({
        caption,
        data: await sharp(await fs.readFile(path.resolve(file)))
          .resize({ width: 1400, height: 1500, fit: 'inside', withoutEnlargement: true })
          .png()
          .toBuffer(),
      })),
    )
    const reviewImages = []
    for (const [i, image] of prepared.entries()) {
      const name = `${referenceKey}-review-${i}.png`
      const asset = await payload.create({
        collection: 'productionAssets',
        file: {
          name,
          data: image.data,
          size: image.data.length,
          mimetype: 'image/png',
        },
        data: { kind: 'other', notes: `${image.caption}. Private model-review reference.` },
      })
      reviewImages.push({ caption: image.caption, image: asset.id })
    }
    const model = await payload.create({
      collection: 'caseBlanks',
      data: {
        title: 'iPhone 17 Pro Max — Walker fine-hole blank',
        referenceKey,
        phoneModel: models.docs[0].id,
        supplierURL:
          'https://www.alibaba.com/product-detail/Dust-Repellent-Smooth-Color-Liquid-Silicone_1601927395824.html',
        supplierVariant: 'For iPhone17 Pro Max; color still to choose',
        availability: 'verified',
        availabilityCheckedAt: new Date().toISOString(),
        cameraCoverage: 'fineHoles',
        previewStatus: 'review',
        sampleStatus: 'pending',
        geometryVersion: version,
        geometry: MODEL,
        reviewImages,
        reviewNotes:
          'Listing and exact iPhone17 Pro Max option checked in the supplier UI on 2026-09-15. Silicone + PC listed. Shipping details require supplier confirmation; this is a listing check, not a stock reservation. The customization panel describes back printing only, so side-wrap capability is NOT established. The shared listing photograph has a covered camera surround and individual openings. Only the 165 × 81 × 13 mm envelope comes from the listing; all detail dimensions and curved-surface mapping remain estimates. Existing neutral/checker/presentation renders document this geometry; no approval has been given. Review camera spacing, rim proportions, side openings and artwork continuity. Physical fit and print validation remain pending. Broader phone checklist: docs/case-models.md.',
      },
    })
    console.log(`Model review ready: /admin/collections/caseBlanks/${model.id}`)
  }
} finally {
  await payload.destroy()
}

process.exit(0)
