'use client'

import { Price } from '@/components/Price'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Product, Variant } from '@/payload-types'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DeleteItemButton } from './DeleteItemButton'
import { EditItemQuantityButton } from './EditItemQuantityButton'
import { OpenCartButton } from './OpenCart'
import { getProductThumbnail } from '@/utilities/productImages'
import { cartPricing } from '@/lib/commerce/bundlePricing'

export function CartModal() {
  const { cart, isLoading } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  useEffect(() => setIsOpen(false), [pathname])
  useEffect(() => {
    const open = () => setIsOpen(true)
    window.addEventListener('store:open-cart', open)
    return () => window.removeEventListener('store:open-cart', open)
  }, [])
  const items = cart?.items ?? []
  const quantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0)
  const pricing = (cart?.currency ?? 'USD') === 'USD' ? cartPricing(items) : null
  return (
    <Sheet onOpenChange={setIsOpen} open={isOpen}>
      <SheetTrigger asChild>
        <OpenCartButton quantity={quantity || undefined} />
      </SheetTrigger>
      <SheetContent
        className="flex w-full flex-col bg-[#f2f1eb] text-[#2a2d25] sm:max-w-lg"
        data-lenis-prevent
      >
        <SheetHeader className="border-b border-[#c9cec0] pb-6 text-left">
          <SheetTitle className="text-3xl font-normal text-[#2a2d25]">Your selection</SheetTitle>
          <SheetDescription className="text-[#656b5e]">
            A little rotation. A lot of personality.
          </SheetDescription>
        </SheetHeader>
        {quantity === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <ShoppingBag size={42} strokeWidth={1} />
            <h3 className="text-2xl">Your next three start here.</h3>
            <p className="max-w-xs text-sm text-[#626b56]">
              Mix your favourite designs. Any three cases for $50.
            </p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="border border-[#73805e] px-6 py-3"
            >
              Explore the designs
            </button>
          </div>
        ) : (
          <>
            <div
              className="border border-[#bac998] bg-[#e3eaca] px-4 py-4 text-sm"
              aria-live="polite"
            >
              <strong className="font-medium">
                {quantity % 3 === 0
                  ? `${quantity / 3} ${quantity === 3 ? 'set' : 'sets'} complete · ${quantity} cases`
                  : `${3 - (quantity % 3)} more ${3 - (quantity % 3) === 1 ? 'case' : 'cases'} to complete ${quantity > 3 ? 'your next' : 'your'} $50 set`}
              </strong>
              <p className="mt-1 text-xs text-[#5a6849]">
                Every complete set of three gets the offer automatically.
              </p>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#cbd0c2]">
              {items.map((item) => {
                const product =
                  item.product && typeof item.product === 'object'
                    ? (item.product as Product)
                    : null
                const variant =
                  item.variant && typeof item.variant === 'object'
                    ? (item.variant as Variant)
                    : null
                if (!product) return null
                const image = getProductThumbnail(product)
                const unitPrice = variant?.priceInUSD ?? product.priceInUSD
                return (
                  <li key={item.id} className="flex gap-4 py-5">
                    <Link
                      href={`/products/${product.slug}`}
                      className="flex h-28 w-20 shrink-0 items-center justify-center bg-[#dfe3d9]"
                    >
                      {image?.url && (
                        <img
                          src={image.url}
                          alt={product.title}
                          className="h-full w-full object-contain p-2"
                        />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <Link href={`/products/${product.slug}`} className="text-base">
                          {product.title}
                        </Link>
                        <DeleteItemButton item={item} />
                      </div>
                      <p className="mt-1 text-xs text-[#68705e]">
                        {variant?.options
                          ?.map((option) => (typeof option === 'object' ? option.label : ''))
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <div className="flex h-9 items-center border border-[#b4bdab]">
                          <EditItemQuantityButton item={item} type="minus" />
                          <span className="w-6 text-center text-xs">{item.quantity}</span>
                          <EditItemQuantityButton item={item} type="plus" />
                        </div>
                        {typeof unitPrice === 'number' && (
                          <span className="text-right text-xs">
                            <Price as="span" amount={unitPrice * item.quantity} />
                            <small className="block text-[#73796b]">before offer</small>
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="border-t border-[#bfc8b4] pt-4">
              {pricing && pricing.discount > 0 && (
                <div className="mb-3 flex justify-between text-sm text-[#566840]">
                  <span>Three-case savings</span>
                  <span>
                    −<Price amount={pricing.discount} as="span" />
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xl">
                <span>Subtotal</span>
                <Price amount={cart?.subtotal ?? 0} />
              </div>
              <p className="mt-2 text-xs text-[#717966]">Shipping and tax are separate.</p>
              <Link
                aria-disabled={isLoading}
                onClick={(event) => {
                  if (isLoading) event.preventDefault()
                }}
                href="/checkout"
                className="mt-5 flex w-full items-center justify-between bg-[#303c2b] px-5 py-4 text-sm text-white"
              >
                Review your order <ArrowRight size={18} />
              </Link>
              <button
                type="button"
                className="mt-4 w-full text-center text-xs underline underline-offset-4"
                onClick={() => setIsOpen(false)}
              >
                Keep exploring designs
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
