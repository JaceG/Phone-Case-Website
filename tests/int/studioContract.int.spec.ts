import { describe, expect, it } from 'vitest'
import { DEFAULT, MODEL } from '@/components/case-studio/artwork'
import { effectiveDPI, emptyDetails, validateSave } from '@/lib/studio/contract'

const input = () => ({
  previous: null,
  model: MODEL.slug,
  placement: { ...DEFAULT },
  details: { ...emptyDetails, title: 'Orbit', slug: 'orbit' },
})
describe('catalog studio contract', () => {
  it('preserves placement and camera-inclusive back print mode without source effects', () => {
    const v = input()
    v.placement.printMode = 'back'
    v.placement.rotation = 23
    const saved = validateSave({ ...v, placement: { ...v.placement, fade: 200 } })
    expect(saved.placement).toEqual(v.placement)
    expect(saved.placement).not.toHaveProperty('fade')
  })
  it('rejects impossible geometry, malformed metadata and unsupported models', () => {
    expect(() => validateSave({ ...input(), model: 'galaxy-s25' })).toThrow()
    expect(() => validateSave({ ...input(), placement: { ...DEFAULT, width: Infinity } })).toThrow()
    expect(() => validateSave({ ...input(), previous: -1 })).toThrow()
    expect(() =>
      validateSave({ ...input(), details: { ...input().details, slug: '../private' } }),
    ).toThrow()
    expect(() =>
      validateSave({ ...input(), details: { ...input().details, price: 39.001 } }),
    ).toThrow()
  })
  it('retains licensed image sources and agreement references', () => {
    const v = input()
    v.details.license = 'licensed'
    expect(() => validateSave(v)).toThrow('permission')
    v.details.permission = 'Agreement ABC'
    v.details.source = 'Approved asset library'
    expect(validateSave(v).details).toEqual(v.details)
  })
  it('reports actual image resolution at placement size', () => {
    expect(effectiveDPI(1080, 1080, 10)).toBe(254)
    expect(effectiveDPI(1080, 2160, 10)).toBe(127)
  })
})
