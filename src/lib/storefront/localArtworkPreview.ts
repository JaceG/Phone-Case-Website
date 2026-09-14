import fs from 'node:fs/promises'
import path from 'node:path'

import type { Storefront } from './loadStorefront'

/** Local artwork trials live outside the catalog and all committed assets. */
export const withLocalArtworkPreview = async (
  storefront: Storefront,
  enabled?: string,
): Promise<Storefront> => {
  if (process.env.NODE_ENV !== 'development' || enabled !== '1' || !storefront.design)
    return storefront

  const root = path.join(process.cwd(), 'placeholder', 'artwork-preview')
  let raw: string
  try {
    raw = await fs.readFile(path.join(root, 'manifest.json'), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return storefront
    throw error
  }
  const manifest = JSON.parse(raw) as {
    title: string
    prefix: string
    description: string
    palette: string[]
  }
  if (!/^[a-z0-9-]+$/.test(manifest.prefix)) throw new Error('Invalid artwork preview prefix')
  const files = await fs.readdir(path.join(root, 'renders'))
  const url = (file: string) => `/artwork-preview/${file}`
  const still = (camera: string) => url(`${manifest.prefix}_${camera}.png`)
  const frames = (camera: string) =>
    files
      .filter((file) => new RegExp(`^${manifest.prefix}_${camera}_\\d{3}\\.webp$`).test(file))
      .sort()
      .map(url)
  const tumble = frames('tumble')
  const phases = tumble.length
    ? (JSON.parse(
        await fs.readFile(path.join(root, 'renders', `${manifest.prefix}_tumble.json`), 'utf8'),
      ).phases as number[])
    : null
  if (phases && phases.length !== tumble.length)
    throw new Error('Incomplete artwork preview sequence')

  const base = storefront.design
  const preview = {
    ...base,
    title: manifest.title,
    tagline: 'Artwork placement test.',
    story: {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '' as const,
        indent: 0,
        children: [
          {
            type: 'paragraph',
            version: 1,
            children: [{ type: 'text', version: 1, text: manifest.description }],
          },
        ],
      },
    },
    palette: manifest.palette,
    collections: [{ id: -1, title: 'Print study', slug: 'print-study' }],
    variants: [],
    modelRenders: {},
    gallery: [],
    renders: {
      hero: still('hero'),
      threeQuarter: still('three_quarter'),
      flat: still('flat'),
      turntable: frames('turntable'),
      tumble,
      tumblePhases: phases,
    },
  }
  return {
    ...storefront,
    design: preview,
    catalog: storefront.catalog.map((design) => (design.id === base.id ? preview : design)),
  }
}
