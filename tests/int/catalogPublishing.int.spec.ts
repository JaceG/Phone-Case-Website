import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { MODEL, DEFAULT } from '@/components/case-studio/artwork'
import {
  adaptPlacement,
  artworkSVG,
  template,
  validatePlacement,
} from '@/lib/studio-publish/placement'
import { toCatalogDesign, rendersFor, variantFor } from '@/components/store/catalog'
import type { Product } from '@/payload-types'
const source = 'data:image/png;base64,AAAA'
describe('catalog publishing placement and assets', () => {
  it('maps positions between case backs without stretching the artwork', () => {
    const smaller = { ...MODEL, width_mm: 70, height_mm: 140, depth_mm: 12 }
    const t = template(smaller),
      p = adaptPlacement(DEFAULT, smaller)
    expect(p.x).toBeCloseTo(t.width / 2)
    expect(p.y).toBeCloseTo(t.height / 2)
    expect(p.width).toBeCloseTo(DEFAULT.width * Math.min(70 / 81, 140 / 165))
  })
  it('uses the same placement coordinates, angle, and image ratio in preview and export', () => {
    const p = { ...DEFAULT, x: 333, y: 777, width: 500, rotation: 23 }
    const svg = artworkSVG(MODEL, p, source, 2)
    expect(svg).toContain('width="500" height="250"')
    expect(svg).toContain('translate(333 777) rotate(23)')
    expect(svg).not.toContain('gradient')
  })
  it('masks individual holes for back-only while composing solid case color separately', () => {
    const p = { ...DEFAULT, printMode: 'back' as const, silicone: '#123456' }
    const svg = artworkSVG(MODEL, p, source, 1)
    expect(svg).toContain('mask="url(#print)"')
    expect(svg.match(/<circle /g)).toHaveLength(MODEL.holes.length)
    expect(svg).not.toContain('fill="#123456"')
    expect(artworkSVG(MODEL, p, source, 1, true)).toContain('fill="#123456"')
  })
  it('exports transparent openings and sides while keeping the camera surround printable', async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#f00' } })
      .png()
      .toBuffer()
    const p = { ...DEFAULT, printMode: 'back' as const }
    const { data, info } = await sharp(
      Buffer.from(artworkSVG(MODEL, p, 'data:image/png;base64,' + png.toString('base64'), 1)),
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const alpha = (x: number, y: number) =>
      data[(Math.round(y) * info.width + Math.round(x)) * 4 + 3]
    const t = template(MODEL)
    expect(alpha(1, 1)).toBe(0)
    expect(alpha(t.holes[0].x, t.holes[0].y)).toBe(0)
    expect(alpha(t.width / 2, t.back.y + 50)).toBe(255)
    expect(alpha(t.width / 2, t.height / 2)).toBe(255)
  })
  it('rejects invalid placement and image input', () => {
    expect(() => validatePlacement({ ...DEFAULT, width: Infinity }, MODEL)).toThrow()
    expect(() => validatePlacement({ ...DEFAULT, background: 'url(x)' }, MODEL)).toThrow()
    expect(() => artworkSVG(MODEL, DEFAULT, 'https://other.example/image.jpg', 1)).toThrow()
  })
  it('loads a new design from published render metadata instead of the starter-design list', () => {
    const product = {
      id: 90,
      title: 'New artwork',
      slug: 'new-artwork',
      priceInUSD: 3900,
      studioPresentation: {
        revision: 3,
        job: 'job',
        gallery: ['/api/media/file/art.webp'],
        models: {
          '66': {
            version: 'approved-v1',
            hero: '/api/media/file/hero.webp',
            flat: '/api/media/file/flat.webp',
            geometry: '/store/cases/mini/shell.glb',
            texture: '/api/media/file/texture.webp',
          },
        },
      },
      variants: { docs: [{ id: 100, options: [6], priceInUSD: 3900 }] },
    } as unknown as Product
    const design = toCatalogDesign(product)
    const model = {
      id: 66,
      name: 'Mini',
      slug: 'mini',
      brand: 'apple' as const,
      status: 'active' as const,
      optionId: 6,
      sortOrder: 0,
      previewVersion: 'approved-v1',
    }
    expect(rendersFor(design, model).texture).toBe('/api/media/file/texture.webp')
    expect(design.renders.geometry).toBe('/store/cases/mini/shell.glb')
    expect(variantFor(design, model)?.id).toBe(100)
    expect(variantFor(design, { ...model, id: 75 })).toBeNull()
  })
})
