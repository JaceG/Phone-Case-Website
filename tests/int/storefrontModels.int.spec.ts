import { describe, expect, it } from 'vitest'
import {
  rendersFor,
  heroImageFor,
  thumbImageFor,
  variantFor,
  groupPhoneModels,
  type CatalogDesign,
  type CatalogPhoneModel,
} from '@/components/store/catalog'
import { HERO_PHASES, HERO_LOOP_SECONDS, heroPhaseAt } from '@/components/store/heroMotion'
import { hasCurrentApproval, type ModelAssets } from '@/lib/storefront/approvedModels'

const model = (slug: string, id = 1) =>
  ({
    id,
    slug,
    name: slug,
    brand: slug.startsWith('iphone') ? 'apple' : 'samsung',
    previewVersion: 'v1',
  }) as CatalogPhoneModel
const design = {
  renders: {
    hero: '/original-phone.png',
    flat: '/original-flat.png',
    threeQuarter: null,
    tumble: ['/old-spin-1.webp', '/old-spin-2.webp'],
    turntable: [],
    tumblePhases: [0, 0.5],
  },
  modelRenders: {
    '1': {
      hero: '/samsung.png',
      flat: '/samsung-flat.png',
      geometry: '/samsung.glb',
      texture: '/art.webp',
      detail: '/samsung-detail.webp',
    },
  },
} as unknown as CatalogDesign

describe('approved models in the storefront', () => {
  it('does not animate the original iPhone shell when another model is selected', () => {
    const selected = rendersFor(design, model('galaxy-s26-ultra'))
    expect(selected.hero).toBe('/samsung.png')
    expect(selected.geometry).toBe('/samsung.glb')
    expect(selected.detail).toBe('/samsung-detail.webp')
    expect(selected.tumble).toEqual([])
    expect(heroImageFor(design, model('iphone-16e', 2))).toBeNull()
    expect(thumbImageFor(design, model('iphone-16e', 2))).toBeNull()
    expect(variantFor(design, { ...model('iphone-16e', 2), optionId: 99 })).toBeNull()
    expect(selected.turntable).toEqual([])
  })
  it('does not substitute a different phone when an approved model lacks design assets', () => {
    const selected = rendersFor(design, model('iphone-16e', 2))
    expect(selected.hero).toBeNull()
    expect(selected.flat).toBeNull()
    expect(selected.tumble).toEqual([])
  })
  it('retains the original presentation until a phone is chosen', () => {
    expect(rendersFor(design, null)).toBe(design.renders)
  })
  it('requires a current approval and rejects changed or withdrawn versions', () => {
    const asset = { version: 'v1' } as ModelAssets
    expect(hasCurrentApproval(asset, 'v1')).toBe(true)
    expect(hasCurrentApproval(asset, undefined)).toBe(false)
    expect(hasCurrentApproval(asset, 'v2')).toBe(false)
    expect(hasCurrentApproval(undefined, 'v1')).toBe(false)
  })
  it('keeps e, mini, FE and Edge variants in their understandable phone families', () => {
    const groups = groupPhoneModels(
      [
        'iphone-16',
        'iphone-16e',
        'iphone-12-mini',
        'iphone-se-2022',
        'galaxy-s25-fe',
        'galaxy-s25-edge',
      ].map((slug) => model(slug)),
    )
    expect(groups.map(([name, entries]) => [name, entries.length])).toEqual([
      ['iPhone 16', 2],
      ['iPhone 12', 1],
      ['iPhone SE', 1],
      ['Galaxy S25', 2],
    ])
  })
  it('preserves the 3.55-second fixed-axis loop and front-facing dwell', () => {
    expect(HERO_PHASES).toHaveLength(289) // 288 samples plus the closing endpoint
    expect(HERO_PHASES.every((phase, i) => !i || phase > HERO_PHASES[i - 1])).toBe(true)
    expect(heroPhaseAt(0)).toBe(0)
    expect(heroPhaseAt(HERO_LOOP_SECONDS)).toBe(0)
    const visible = HERO_PHASES.slice(0, -1).filter((p) => Math.min(p, 1 - p) < 0.14).length / 288
    expect(visible).toBeGreaterThan(0.68)
    expect(visible).toBeLessThan(0.74)
  })
})
