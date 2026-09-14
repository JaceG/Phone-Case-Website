import { describe, expect, it } from 'vitest'
import { priceCases } from '@/lib/commerce/bundlePricing'

describe('three cases for $50', () => {
  it.each([
    [0, 0],
    [1, 3900],
    [2, 7800],
    [3, 5000],
    [4, 8900],
    [5, 12800],
    [6, 10000],
    [7, 13900],
  ])('prices %i cases at %i cents', (quantity, subtotal) => {
    expect(priceCases(quantity ? [{ quantity, unitPrice: 3900 }] : []).subtotal).toBe(subtotal)
  })
  it('bundles the more expensive designs first and preserves a cheaper remainder', () => {
    const lines = [
      { unitPrice: 4200, quantity: 2 },
      { unitPrice: 3900, quantity: 2 },
    ]
    expect(priceCases(lines).subtotal).toBe(8900)
    expect(priceCases([...lines].reverse()).subtotal).toBe(8900)
  })
  it('does not increase the price of inexpensive cases', () => {
    expect(priceCases([{ unitPrice: 1000, quantity: 3 }]).subtotal).toBe(3000)
    expect(
      priceCases([
        { unitPrice: 3900, quantity: 3 },
        { unitPrice: 1000, quantity: 3 },
      ]).subtotal,
    ).toBe(8000)
  })
  it('matches a simple unit-by-unit reference across mixed prices and quantities', () => {
    for (let a = 1; a <= 7; a++)
      for (let b = 1; b <= 7; b++) {
        const lines = [
          { unitPrice: 4200, quantity: a },
          { unitPrice: 1200, quantity: b },
          { unitPrice: 3900, quantity: 2 },
        ]
        const units = lines
          .flatMap((line) => Array(line.quantity).fill(line.unitPrice))
          .sort((x, y) => y - x)
        let total = 0
        while (units.length >= 3)
          total += Math.min(
            5000,
            units.splice(0, 3).reduce((x, y) => x + y, 0),
          )
        total += units.reduce((x, y) => x + y, 0)
        expect(priceCases(lines).subtotal).toBe(total)
      }
  })
  it.each([
    { unitPrice: -1, quantity: 1 },
    { unitPrice: 39.5, quantity: 1 },
    { unitPrice: 3900, quantity: 0 },
    { unitPrice: 3900, quantity: 1.5 },
    { unitPrice: Infinity, quantity: 1 },
  ])('rejects invalid money and quantities', (line) => {
    expect(() => priceCases([line])).toThrow()
  })
})
