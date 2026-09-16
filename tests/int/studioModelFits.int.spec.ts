import { describe, expect, it } from 'vitest'
import { DEFAULT, MODEL } from '@/components/case-studio/artwork'
import { adaptPlacement } from '@/lib/studio-publish/placement'
import {
  renderPlacements,
  savedModelSettings,
  validateModelSettings,
} from '@/lib/studio/modelSettings'
import type { StudioPhone } from '@/lib/studio-publish/types'

const iphone: StudioPhone = {
  id: 1,
  name: 'iPhone',
  slug: MODEL.slug,
  brand: 'apple',
  version: 'iphone-v1',
  geometryURL: '/iphone.glb',
  params: MODEL,
}
const samsung: StudioPhone = {
  ...iphone,
  id: 2,
  name: 'Samsung',
  slug: 'galaxy',
  brand: 'samsung',
  version: 'galaxy-v1',
  params: { ...MODEL, width_mm: 77, height_mm: 160 },
}
const phones = [iphone, samsung]
const fit = {
  ...DEFAULT,
  x: DEFAULT.x + 32,
  width: DEFAULT.width * 1.2,
  printMode: 'back' as const,
}
const settings = () => ({
  phones: [2, 1],
  placements: { '1': { version: iphone.version, placement: fit } },
})

describe('saved per-phone fits', () => {
  it('keeps a custom crop independent while unadjusted phones follow the shared fit', () => {
    const first = renderPlacements(DEFAULT, settings(), phones)
    const moved = { ...DEFAULT, y: DEFAULT.y + 100 }
    const next = renderPlacements(moved, settings(), phones)
    expect(first['1']).toEqual(fit)
    expect(next['1']).toEqual(fit)
    expect(first['2']).toEqual(adaptPlacement(DEFAULT, samsung.params))
    expect(next['2']).toEqual(adaptPlacement(moved, samsung.params))
  })
  it('retains custom fits when excluded, restores shared placement when reset, and accepts legacy saves', () => {
    const excluded = validateModelSettings({ ...settings(), phones: [2] }, phones)
    expect(excluded.placements['1'].placement).toEqual(fit)
    expect(renderPlacements(DEFAULT, excluded, phones)).not.toHaveProperty('1')
    expect(renderPlacements(DEFAULT, { phones: [1], placements: {} }, phones)['1']).toEqual(DEFAULT)
    expect(savedModelSettings(DEFAULT)).toBeUndefined()
    expect(savedModelSettings({ ...DEFAULT, modelSettings: excluded })).toEqual(excluded)
  })
  it('rejects unapproved phones, obsolete geometry versions and invalid crop bounds', () => {
    expect(() => validateModelSettings({ ...settings(), phones: [99] }, phones)).toThrow()
    expect(() =>
      validateModelSettings(settings(), [{ ...iphone, version: 'iphone-v2' }, samsung]),
    ).toThrow('changed')
    expect(() =>
      validateModelSettings(
        {
          phones: [1],
          placements: { '1': { version: iphone.version, placement: { ...fit, width: Infinity } } },
        },
        phones,
      ),
    ).toThrow()
    expect(() =>
      validateModelSettings(
        { phones: [1], placements: { '99': { version: 'bad', placement: fit } } },
        phones,
      ),
    ).toThrow()
  })
})
