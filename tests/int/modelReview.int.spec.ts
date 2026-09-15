import { describe, expect, it } from 'vitest'
import {
  canReview,
  filterModels,
  phoneFamily,
  phoneFamilyOptions,
  safeLink,
  type ReviewModel,
} from '@/lib/model-review/shared'
const make = (overrides: Partial<ReviewModel> = {}) =>
  ({
    id: 1,
    title: 'Fine-hole case',
    phone: 'iPhone 17',
    supplierVariant: 'Black',
    batch: 'September',
    status: 'review',
    stage: 'ready',
    version: 'v1',
    images: [{ caption: 'Back', url: '/private.png' }],
    brand: 'apple',
    ...overrides,
  }) as ReviewModel

describe('model review dashboard', () => {
  it('keeps submodels in their phone family across preparation batches', () => {
    const models = [
      make({ phone: 'iPhone 16 Pro', batch: 'Original studies' }),
      make({ id: 2, phone: 'iPhone 16e', batch: 'Later additions' }),
      make({ id: 3, phone: 'iPhone 17e', batch: 'Later additions' }),
    ]
    expect(filterModels(models, '', 'all', 'apple', 'all', 'iPhone 16').map((m) => m.id)).toEqual([
      1, 2,
    ])
    expect(phoneFamily(make({ phone: 'iPhone SE (2020)' }))).toBe('iPhone SE')
    expect(phoneFamily(make({ phone: 'iPhone SE (2022)' }))).toBe('iPhone SE')
    expect(phoneFamily(make({ phone: 'iPhone Air' }))).toBe('iPhone Air')
  })
  it('lists families newest first within each brand with counts and brand filtering', () => {
    const models = [
      make({ phone: 'iPhone 12 mini' }),
      make({ phone: 'iPhone 17 Pro Max' }),
      make({ phone: 'iPhone 17e' }),
      make({ phone: 'iPhone SE (2022)' }),
      make({ phone: 'Pixel 9 Pro', brand: 'google' }),
      make({ phone: 'Galaxy S25 Ultra', brand: 'samsung' }),
      make({ phone: 'Galaxy S25', brand: 'samsung' }),
    ]
    expect(phoneFamilyOptions(models).map((g) => [g.label, g.count])).toEqual([
      ['iPhone 17', 2],
      ['iPhone 12', 1],
      ['iPhone SE', 1],
      ['Galaxy S25', 2],
      ['Pixel 9', 1],
    ])
    expect(phoneFamilyOptions(models, 'google').map((g) => g.label)).toEqual(['Pixel 9'])
  })
  it('combines search, status, brand and batch without a linear review order', () => {
    const models = [
      make(),
      make({ id: 2, phone: 'Pixel 9', brand: 'google', status: 'changes' }),
      make({ id: 3, batch: 'October', stage: 'failed', status: 'draft' }),
    ]
    expect(
      filterModels(models, 'pixel', 'attention', 'google', 'September').map((m) => m.id),
    ).toEqual([2])
    expect(filterModels(models, '', 'attention', 'all', 'all').map((m) => m.id)).toEqual([2, 3])
    expect(filterModels(models, '', 'approved', 'all', 'all')).toEqual([])
  })
  it('does not offer approval for queued or missing previews', () => {
    expect(canReview(make())).toBe(true)
    expect(canReview(make({ stage: 'modeling' }))).toBe(false)
    expect(canReview(make({ version: 'pending' }))).toBe(false)
    expect(canReview(make({ images: [] }))).toBe(false)
  })
  it('accepts only web links for supplied references', () => {
    expect(safeLink('https://example.com/case')).toBe('https://example.com/case')
    expect(safeLink('javascript:alert(1)')).toBe('')
  })
})
