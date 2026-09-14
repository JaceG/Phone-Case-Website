'use client'

import Link from 'next/link'
import type { CartItem } from './index'
import { groupCartDesigns } from '@/lib/commerce/groupCartDesigns'
import { getProductThumbnail } from '@/utilities/productImages'
import { EditItemQuantityButton } from './EditItemQuantityButton'
import { DeleteItemButton } from './DeleteItemButton'
import { AddCaseForPhone } from './AddCaseForPhone'
import './cart.css'

export function CartDesignList({ items }: { items: CartItem[] }) {
  return (
    <ul className="cart-design-list">
      {groupCartDesigns(items).map(({ product, items: lines, quantity }) => {
        const image = getProductThumbnail(product)
        return (
          <li className="cart-design-group" key={product.id}>
            <div className="cart-design-heading">
              <Link href={`/products/${product.slug}`} className="cart-design-thumbnail">
                {image?.url && <img src={image.url} alt={product.title} />}
              </Link>
              <div>
                <Link href={`/products/${product.slug}`} className="cart-design-title">
                  {product.title}
                </Link>
                <p>
                  {quantity} {quantity === 1 ? 'case' : 'cases'} · {lines.length}{' '}
                  {lines.length === 1 ? 'phone model' : 'phone models'}
                </p>
              </div>
            </div>
            <ul className="cart-model-list" aria-label={`${product.title} phone models`}>
              {lines.map((item) => {
                const variant = typeof item.variant === 'object' ? item.variant : null
                const label =
                  variant?.options
                    ?.map((option) => (typeof option === 'object' ? option.label : ''))
                    .filter(Boolean)
                    .join(', ') || 'Phone model'
                return (
                  <li
                    key={item.id}
                    className="cart-model-row"
                    aria-label={`${product.title} · ${label}`}
                  >
                    <span>{label}</span>
                    <div
                      className="cart-model-quantity"
                      role="group"
                      aria-label={`${label} quantity`}
                    >
                      <EditItemQuantityButton item={item} type="minus" />
                      <span>{item.quantity}</span>
                      <EditItemQuantityButton item={item} type="plus" />
                    </div>
                    <DeleteItemButton item={item} />
                  </li>
                )
              })}
            </ul>
            <AddCaseForPhone productId={product.id} title={product.title} />
          </li>
        )
      })}
    </ul>
  )
}
