import type { Artwork, Category, Media, Product } from '@/payload-types'
import type { RequiredDataFromCollectionSlug } from 'payload'

type DesignArgs = {
  title: string
  slug: string
  tagline: string
  story: string
  palette: string[]
  priceInUSD: number
  artwork: Artwork
  hero: Media
  threeQuarter: Media
  flat: Media
  collections: Category[]
  relatedProducts?: Product[]
}

const paragraph = (text: string): NonNullable<Product['description']> => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        textFormat: 0,
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text,
            version: 1,
          },
        ],
      },
    ],
  },
})

export const designData = ({
  title,
  slug,
  tagline,
  story,
  palette,
  priceInUSD,
  artwork,
  hero,
  threeQuarter,
  flat,
  collections,
  relatedProducts = [],
}: DesignArgs): RequiredDataFromCollectionSlug<'products'> => ({
  title,
  slug,
  tagline,
  description: paragraph(story),
  palette: palette.map((hex) => ({ hex })),
  artwork: artwork.id,
  renderStatus: 'ready',
  renders: {
    hero: hero.id,
    threeQuarter: threeQuarter.id,
    flat: flat.id,
    turntable: [],
  },
  gallery: [],
  layout: [],
  enableVariants: true,
  priceInUSDEnabled: true,
  priceInUSD,
  collections: collections.map((c) => c.id),
  relatedProducts: relatedProducts.map((p) => p.id),
  meta: {
    title,
    description: tagline,
    image: hero.id,
  },
  _status: 'published',
})

export const seedDesigns: Array<
  Pick<DesignArgs, 'title' | 'slug' | 'tagline' | 'story' | 'palette' | 'priceInUSD'> & {
    hue: number
    collection: string
  }
> = [
  {
    title: 'Meridian',
    slug: 'meridian',
    tagline: 'A single line, drawn once.',
    story:
      'Placeholder design. Every image on this page is a generated UV checker so alignment and edge wrap can be verified before a real artwork ever touches the pipeline.',
    palette: ['#0b1220', '#4f7cff', '#dbe4ff'],
    priceInUSD: 3900,
    hue: 220,
    collection: 'Night Series',
  },
  {
    title: 'Static Bloom',
    slug: 'static-bloom',
    tagline: 'Noise, arranged.',
    story:
      'Placeholder design. Numbered cells make stretching visible at a glance; the crosshair and frame confirm the print template and the render UV share one coordinate space.',
    palette: ['#1a0b1e', '#c052ff', '#f3dcff'],
    priceInUSD: 3900,
    hue: 290,
    collection: 'Night Series',
  },
  {
    title: 'Low Tide',
    slug: 'low-tide',
    tagline: 'What the water leaves behind.',
    story:
      'Placeholder design. Swap the artwork on this product for a real print master and the render pipeline replaces every image here.',
    palette: ['#061a17', '#2fbf9b', '#d8fff4'],
    priceInUSD: 4200,
    hue: 165,
    collection: 'Shoreline',
  },
]
