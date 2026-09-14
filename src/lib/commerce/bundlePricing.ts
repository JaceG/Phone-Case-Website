/** Prices are integer cents. Every complete set of three cases is at most $50. */
export const CASE_OFFER = { quantity: 3, price: 5000 } as const

export type PricedLine = { unitPrice: number; quantity: number }

export function priceCases(lines: PricedLine[]) {
  for (const line of lines) {
    if (
      !Number.isSafeInteger(line.unitPrice) ||
      line.unitPrice < 0 ||
      !Number.isSafeInteger(line.quantity) ||
      line.quantity < 1
    ) {
      throw new Error('Invalid case price or quantity')
    }
  }
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0)
  const regularSubtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  if (!Number.isSafeInteger(quantity) || !Number.isSafeInteger(regularSubtotal))
    throw new Error('Cart total is too large')
  const bundleCount = Math.floor(quantity / CASE_OFFER.quantity)
  // Put the highest-priced cases in the offer first. Work in runs, not an expanded
  // array, so repeated quantities do not allocate thousands of intermediate items.
  let remaining = bundleCount * CASE_OFFER.quantity
  let groupQuantity = 0
  let groupPrice = 0
  let discount = 0
  for (const line of [...lines].sort((a, b) => b.unitPrice - a.unitPrice)) {
    let available = Math.min(line.quantity, remaining)
    remaining -= available
    if (groupQuantity && available) {
      const take = Math.min(3 - groupQuantity, available)
      groupQuantity += take
      groupPrice += take * line.unitPrice
      available -= take
      if (groupQuantity === 3) {
        discount += Math.max(0, groupPrice - CASE_OFFER.price)
        groupQuantity = groupPrice = 0
      }
    }
    const fullGroups = Math.floor(available / 3)
    discount += fullGroups * Math.max(0, line.unitPrice * 3 - CASE_OFFER.price)
    groupQuantity = available % 3 || groupQuantity
    groupPrice += (available % 3) * line.unitPrice
  }
  return {
    quantity,
    bundleCount,
    regularSubtotal,
    discount,
    subtotal: regularSubtotal - discount,
    remaining: quantity % 3 === 0 && quantity > 0 ? 0 : 3 - (quantity % 3),
  }
}

type CartLine = { quantity?: number | null; product?: unknown; variant?: unknown }
const usdPrice = (value: unknown): number | undefined => {
  if (
    value &&
    typeof value === 'object' &&
    'priceInUSD' in value &&
    typeof value.priceInUSD === 'number'
  )
    return value.priceInUSD
}

/** Client breakdown only; the saved subtotal always comes from the server hook. */
export function cartPricing(items?: CartLine[] | null) {
  const lines = (items ?? []).map((item) => ({
    unitPrice: usdPrice(item.variant) ?? usdPrice(item.product),
    quantity: item.quantity ?? 0,
  }))
  if (lines.some((line) => line.unitPrice === undefined || line.quantity < 1)) return null
  return priceCases(lines as PricedLine[])
}
