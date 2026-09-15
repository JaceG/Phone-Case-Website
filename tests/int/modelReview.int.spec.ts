import { describe, expect, it } from 'vitest'
import { canReview, filterModels, safeLink, type ReviewModel } from '@/lib/model-review/shared'
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
