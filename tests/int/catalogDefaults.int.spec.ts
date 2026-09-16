import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { autofillProduct, extractPalette } from '@/lib/catalog/autofillProduct'
import { plainText, richText, suggestedCopy } from '@/lib/catalog/designDefaults'
const request = () => ({
  payload: { find: vi.fn().mockResolvedValue({ docs: [{ id: 25 }] }), logger: { warn: vi.fn() } },
})
async function fill(data: Record<string, any>, originalDoc?: Record<string, any>) {
  return (await autofillProduct({ data, originalDoc, req: request() } as never)) as Record<
    string,
    any
  >
}
describe('automatic catalog details', () => {
  it('fills routine copy, price, SEO and related designs without guessing permissions', async () => {
    const result = await fill({ title: 'Gohan Ascends' })
    expect(result.tagline).toContain('Gohan Ascends')
    expect(plainText(result.description)).toContain('Gohan Ascends')
    expect(result.priceInUSD).toBe(3900)
    expect(result.meta.title).toContain('Phone Case')
    expect(result.relatedProducts).toEqual([25])
    expect(result).not.toHaveProperty('license')
    expect(result.meta).not.toHaveProperty('image')
  })
  it('keeps customized copy, metadata, palette, prices, relationships and URLs', async () => {
    const original = {
      title: 'Custom',
      tagline: 'My line',
      description: richText('My story'),
      palette: [{ hex: '#abcdef' }],
      slug: 'stable-url',
      priceInUSD: 4200,
      relatedProducts: [27],
      meta: { title: 'Custom SEO', description: 'My search description', image: 44 },
    }
    const data = { title: 'Renamed', renders: { hero: 99 } }
    const result = { ...original, ...(await fill(data, original)) }
    expect(result.tagline).toBe('My line')
    expect(plainText(result.description)).toBe('My story')
    expect(result.slug).toBe('stable-url')
    expect(result.priceInUSD).toBe(4200)
    expect(result.palette).toEqual(original.palette)
    expect(result.relatedProducts).toEqual([27])
    expect(result.meta).toEqual(original.meta)
  })
  it('refreshes automatic copy after a rename, while preserving subsequent edits', async () => {
    const initial = await fill({ title: 'First' })
    const renamed = await fill({ title: 'Second' }, initial)
    expect(renamed.tagline).toBe(suggestedCopy('Second').tagline)
    expect(renamed.meta.title).toContain('Second')
    const custom = await fill({ tagline: 'Owner wording' }, { ...initial, ...renamed })
    const final = await fill({ title: 'Third' }, { ...initial, ...renamed, ...custom })
    expect(final.tagline).toBeUndefined() // unchanged custom field is not rewritten
    expect(final.meta.description).toContain('Owner wording')
  })
  it('uses only public derivatives as sharing images and follows regenerated automatic images', async () => {
    const first = await fill({ title: 'Design', artwork: null, renders: { hero: 8 } })
    expect(first.meta.image).toBe(8)
    expect((await fill({ renders: { hero: 9 } }, first)).meta.image).toBe(9)
    expect((await fill({ meta: { image: 10 }, renders: { hero: 11 } }, first)).meta.image).toBe(10)
  })
  it('preserves deliberate rich-text formatting even when the words match a suggestion', async () => {
    const initial = await fill({ title: 'First' })
    const bold = richText(suggestedCopy('First').description)
    bold.root.children[0].children[0].format = 1
    const result = await fill({ title: 'Renamed', description: bold }, initial)
    expect(result.description).toEqual(bold)
  })
  it('extracts real image colors and ignores transparent pixels', async () => {
    const bytes = await sharp({
      create: { width: 4, height: 1, channels: 4, background: '#123456' },
    })
      .png()
      .toBuffer()
    expect(await extractPalette(bytes)).toEqual(['#123456'])
    const empty = await sharp({
      create: { width: 2, height: 2, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer()
    expect(await extractPalette(empty)).toEqual([])
  })
})
