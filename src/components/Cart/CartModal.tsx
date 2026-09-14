'use client'

import { CartDesignList } from './CartDesignList'
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
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { OpenCartButton } from './OpenCart'
import { cartPricing } from '@/lib/commerce/bundlePricing'
import { SetOfferNotice } from '@/components/store/SetOfferNotice'
import { useStoreUI } from '@/components/store/StoreUI'

export function CartModal() {
  const { cart, isLoading } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { setNextSetFrom } = useStoreUI()
  const returnToBuilder = useRef(false)
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
        className="store-cart-sheet flex w-full flex-col bg-[#f2f1eb] text-[#2a2d25] sm:max-w-lg"
        data-lenis-prevent
        onCloseAutoFocus={(event) => {
          if (returnToBuilder.current) {
            event.preventDefault()
            document
              .getElementById('build-your-three')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            returnToBuilder.current = false
          }
        }}
      >
        <SheetHeader className="shrink-0 border-b border-[#c9cec0] p-0 pr-6 pb-4 text-left">
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
            <SetOfferNotice quantity={quantity} subtotal={cart?.subtotal ?? 0} />
            <div className="cart-items-scroll min-h-0 flex-1 overflow-y-auto">
              <CartDesignList items={items} />
            </div>
            <div className="border-t border-[#bfc8b4] pt-4">
              {pricing && pricing.discount > 0 && (
                <div className="mb-3 flex justify-between text-sm text-[#566840]">
                  <span>Set pricing applied</span>
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
              <Link
                href="/#build-your-three"
                className="mt-4 block w-full border border-[#85916f] px-4 py-3 text-center text-sm"
                onClick={(event) => {
                  setNextSetFrom(quantity % 3 === 0 ? quantity : null)
                  if (document.getElementById('build-your-three')) {
                    event.preventDefault()
                    returnToBuilder.current = true
                  }
                  setIsOpen(false)
                }}
              >
                {quantity % 3 === 0 ? 'Build another set · $50' : 'Finish choosing my set'}
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
