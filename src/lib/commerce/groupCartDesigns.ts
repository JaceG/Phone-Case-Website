import type { Cart, Product } from '@/payload-types'

type Item = NonNullable<Cart['items']>[number]
export type CartDesignGroup = { product: Product; items: Item[]; quantity: number }

/** Presentation only: retain every variant and line ID for edits and fulfillment. */
export function groupCartDesigns(items: Item[]) {
  const groups = new Map<number, CartDesignGroup>()
  for (const item of items) {
    const product = item.product
    if (!product || typeof product !== 'object') continue
    let group = groups.get(product.id)
    if (!group) {
      group = { product, items: [], quantity: 0 }
      groups.set(product.id, group)
    }
    group.items.push(item)
    group.quantity += item.quantity
  }
  return [...groups.values()]
}

export type CasePhoneOption = {
  variantId: number
  phoneModelId: number
  name: string
  price: number
}
