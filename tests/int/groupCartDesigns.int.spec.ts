import { describe, expect, it } from 'vitest'
import { groupCartDesigns } from '@/lib/commerce/groupCartDesigns'
import type { Cart, Product } from '@/payload-types'

describe('cart display grouped by design', () => {
  it('keeps different phone variants editable under one design and preserves line identities', () => {
    const bloom = { id: 1, title: 'Static Bloom' } as Product
    const meridian = { id: 2, title: 'Meridian' } as Product
    const items: NonNullable<Cart['items']> = [
      { id: 'bloom-iphone', product: bloom, variant: 11, quantity: 2 },
      { id: 'meridian-iphone', product: meridian, variant: 21, quantity: 1 },
      { id: 'bloom-galaxy', product: bloom, variant: 12, quantity: 3 },
    ]
    const original = structuredClone(items)
    const groups = groupCartDesigns(items)
    expect(groups).toHaveLength(2)
    expect(groups[0]?.quantity).toBe(5)
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['bloom-iphone', 'bloom-galaxy'])
    expect(groups[0]?.items[1]).toBe(items[2])
    expect(groups[1]?.quantity).toBe(1)
    expect(items).toEqual(original)
  })
  it('uses the design identity, not a shared display title', () => {
    const groups = groupCartDesigns([
      { id: 'a', product: { id: 1, title: 'Same name' } as Product, quantity: 1 },
      { id: 'b', product: { id: 2, title: 'Same name' } as Product, quantity: 1 },
    ])
    expect(groups).toHaveLength(2)
    expect(groupCartDesigns([])).toEqual([])
  })
})
