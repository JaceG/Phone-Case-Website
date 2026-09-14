'use client'

import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import Link from 'next/link'
import { ArrowLeft, Check, LockKeyhole } from 'lucide-react'
import { cartPricing } from '@/lib/commerce/bundlePricing'
import { CartDesignList } from '@/components/Cart/CartDesignList'
import { Price } from '@/components/Price'
import { SetOfferNotice } from '@/components/store/SetOfferNotice'
import { useStoreUI } from '@/components/store/StoreUI'

export function CheckoutPreview() {
  const { cart } = useCart()
  const { setNextSetFrom } = useStoreUI()
  const items = cart?.items ?? []
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const pricing = cartPricing(items)
  return (
    <section className="mx-auto max-w-6xl bg-[#f2f1eb] p-6 text-[#2d3328] md:p-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm">
        <ArrowLeft size={16} /> Back to the designs
      </Link>
      <p className="mt-12 text-xs uppercase tracking-[.18em]">Your next rotation</p>
      <h1 className="mt-3 text-4xl font-normal md:text-6xl">Looks good together.</h1>
      {!quantity ? (
        <div className="py-12">
          <p>Your bag is empty. Choose a design to start your selection.</p>
          <Link className="mt-6 inline-block border border-[#647153] px-6 py-3" href="/">
            Find your three
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-12 md:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="border-b border-[#bec7b2] pb-5 text-sm">
              {quantity} {quantity === 1 ? 'case' : 'cases'} · check your designs and phone models
            </h2>
            <CartDesignList items={items} />
          </div>
          <aside className="self-start border border-[#c1cbb5] bg-[#e5e9dc] p-6">
            <h2 className="text-2xl">Your order</h2>
            <SetOfferNotice quantity={quantity} subtotal={cart?.subtotal ?? 0} />
            {pricing && (
              <div className="mt-7 flex justify-between text-sm">
                <span>Cases at individual prices</span>
                <Price amount={pricing.regularSubtotal} />
              </div>
            )}
            {pricing && pricing.discount > 0 && (
              <div className="mt-4 flex justify-between gap-3 text-sm text-[#52663d]">
                <span className="flex items-center gap-2">
                  <Check size={15} /> Set pricing applied
                </span>
                <span className="whitespace-nowrap">
                  −<Price as="span" amount={pricing.discount} />
                </span>
              </div>
            )}
            <div className="mt-6 flex justify-between border-t border-[#b8c5a8] pt-5 text-xl">
              <span>Subtotal</span>
              <Price amount={cart?.subtotal ?? 0} />
            </div>
            <p className="mt-2 text-xs text-[#68785b]">Shipping and tax are separate.</p>
            <Link
              href="/#build-your-three"
              onClick={() => setNextSetFrom(quantity % 3 === 0 ? quantity : null)}
              className="mt-6 block text-sm underline underline-offset-4"
            >
              {quantity % 3 === 0 ? 'Build another set · $50' : 'Finish choosing my set'} ↗
            </Link>
            <div className="mt-8 border-t border-[#b8c5a8] pt-5">
              <p className="flex items-center gap-2 text-sm font-medium">
                <LockKeyhole size={16} /> Ordering opens soon
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#627154]">
                Your selection is saved on this browser. We are preparing the first collection;
                payment and delivery options will be available when ordering opens.
              </p>
              <button disabled className="mt-5 w-full bg-[#89957c] px-4 py-4 text-sm text-white">
                Payment not open yet
              </button>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}
