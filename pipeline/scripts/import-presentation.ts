import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Product } from '@/payload-types'

const presentation = [
  {
    slug: 'meridian',
    collection: 'Form',
    tagline: 'For days that move in their own orbit.',
    palette: ['#ed3c15', '#ede5d2', '#252726', '#174d9d'],
    story:
      'An oversized vermilion sun, a sweep of ink, and one electric-blue line taking the long way home. Meridian brings the rhythm of a graphic print to the object you reach for all day. Bold from across the room; full of small, paper-like details up close.',
  },
  {
    slug: 'static-bloom',
    collection: 'Flora',
    tagline: 'A little wild. A little unexpected.',
    palette: ['#321d2a', '#ee583b', '#e9a27e', '#8c9562'],
    story:
      'Poppies after dark. Bright petals open against a deep plum ground, threaded with fine stems and little blue interruptions. Static Bloom finds its energy in the contrast: delicate lines, unapologetic colour, and something new to notice each time you pick it up.',
  },
  {
    slug: 'low-tide',
    collection: 'Tide',
    tagline: 'A quieter kind of statement.',
    palette: ['#b6cdc1', '#164b58', '#e7e6cf', '#c49b4e'],
    story:
      'The shoreline, just after the water pulls away. Sea-glass greens and deep teal sweep into pale ribbons beneath a small ochre sun. Low Tide leaves a little space in your day: calm at first glance, with a winding composition that keeps drawing you back.',
  },
]
const story = (text: string): Product['description'] => ({
  root: {
    type: 'root',
    version: 1,
    format: '',
    indent: 0,
    direction: 'ltr',
    children: [
      {
        type: 'paragraph',
        version: 1,
        format: '',
        indent: 0,
        direction: 'ltr',
        children: [
          { type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' },
        ],
      },
    ],
  },
})
if (process.env.NODE_ENV === 'production')
  throw new Error('Presentation studies are imported during local review only.')
const payload = await getPayload({ config })
const backups = path.resolve(
  'pipeline/out/presentation/previous-presentation',
  new Date().toISOString().replaceAll(':', '-'),
)
await fs.mkdir(backups, { recursive: true })
try {
  for (const item of presentation) {
    const { docs } = await payload.find({
      collection: 'products',
      where: { slug: { equals: item.slug } },
      depth: 0,
      limit: 1,
    })
    const product = docs[0]
    if (!product) throw new Error(`Seed the catalog first: missing ${item.slug}`)
    await fs.writeFile(path.join(backups, `${item.slug}.json`), JSON.stringify(product, null, 2))
    const existingCategory = await payload.find({
      collection: 'categories',
      where: { slug: { equals: item.collection.toLowerCase() } },
      depth: 0,
      limit: 1,
    })
    const category =
      existingCategory.docs[0] ??
      (await payload.create({
        collection: 'categories',
        data: { title: item.collection, slug: item.collection.toLowerCase() },
      }))
    const masterPath = `pipeline/designs/${item.slug}.png`
    const artworkName = `${item.slug}-presentation-v1.png`
    const existingArt = await payload.find({
      collection: 'artwork',
      where: { filename: { equals: artworkName } },
      limit: 1,
      depth: 0,
    })
    const raw = await fs.readFile(masterPath)
    const artwork =
      existingArt.docs[0] ??
      (await payload.create({
        collection: 'artwork',
        data: {
          license: 'original',
          designer: 'In-house AI-assisted presentation study',
          colorProfile: 'sRGB',
          dpi: 254,
          licenseNotes:
            'Original concept generated with the built-in image tool, September 2026. Prompts and original output retained in pipeline/artwork. Review-stage artwork; not a certified physical print proof.',
        },
        file: { data: raw, name: artworkName, mimetype: 'image/png', size: raw.length },
      }))
    const gallery: { image: number }[] = []
    for (const [label, filePath] of [
      ['artwork', `public/designs/${item.slug}.webp`],
      ['detail', `pipeline/out/presentation/${item.slug}_detail.png`],
    ]) {
      const alt = `${product.title} — presentation ${label} v1`
      const existing = await payload.find({
        collection: 'media',
        where: { alt: { equals: alt } },
        depth: 0,
        limit: 1,
      })
      const data = await fs.readFile(filePath)
      const media =
        existing.docs[0] ??
        (await payload.create({
          collection: 'media',
          data: { alt },
          file: {
            data,
            name: `${item.slug}-presentation-${label}${path.extname(filePath)}`,
            mimetype: label === 'artwork' ? 'image/webp' : 'image/png',
            size: data.length,
          },
        }))
      gallery.push({ image: media.id })
    }
    await payload.update({
      collection: 'products',
      id: product.id,
      depth: 0,
      data: {
        tagline: item.tagline,
        description: story(item.story),
        palette: item.palette.map((hex) => ({ hex })),
        collections: [category.id],
        artwork: artwork.id,
        gallery,
        modelRenders: [],
        meta: {
          ...product.meta,
          title: `${product.title} Phone Case`,
          image:
            typeof product.renders?.hero === 'object'
              ? product.renders.hero?.id
              : product.renders?.hero,
          description: `${item.tagline} Choose your phone and mix any three designs for $50.`,
        },
      },
    })
    console.log(`Prepared ${item.slug}; retained its individual price and variant IDs.`)
  }
  // Reprice active draft carts once so previously saved selections show the offer.
  const carts = await payload.find({
    collection: 'carts',
    where: { purchasedAt: { exists: false } },
    depth: 0,
    pagination: false,
  })
  for (const cart of carts.docs) {
    await fs.writeFile(path.join(backups, `cart-${cart.id}.json`), JSON.stringify(cart, null, 2))
    await payload.update({
      collection: 'carts',
      id: cart.id,
      data: { items: cart.items ?? [], currency: cart.currency ?? 'USD' },
      depth: 0,
    })
  }
} finally {
  await payload.destroy()
}
