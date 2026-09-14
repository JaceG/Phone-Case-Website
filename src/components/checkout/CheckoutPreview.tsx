'use client'

import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import Link from 'next/link'
import type { Product, Variant } from '@/payload-types'
import { ArrowLeft, Check, LockKeyhole } from 'lucide-react'
import { getProductThumbnail } from '@/utilities/productImages'
import { cartPricing } from '@/lib/commerce/bundlePricing'
import { Price } from '@/components/Price'
import { EditItemQuantityButton } from '@/components/Cart/EditItemQuantityButton'
import { DeleteItemButton } from '@/components/Cart/DeleteItemButton'

export function CheckoutPreview() {
  const { cart } = useCart()
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
            <ul className="divide-y divide-[#c5ccbb]">
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
                return (
                  <li key={item.id} className="flex gap-5 py-6">
                    {image?.url && (
                      <img
                        src={image.url}
                        alt={product.title}
                        className="h-36 w-24 bg-[#dce1d5] object-contain p-2"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between gap-4">
                        <Link href={`/products/${product.slug}`} className="text-xl">
                          {product.title}
                        </Link>
                        <DeleteItemButton item={item} />
                      </div>
                      <p className="mt-2 text-sm text-[#657259]">
                        {variant?.options
                          ?.map((option) => (typeof option === 'object' ? option.label : ''))
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      <div className="mt-5 flex w-fit items-center border border-[#b5bfaa]">
                        <EditItemQuantityButton item={item} type="minus" />
                        <span className="w-7 text-center text-sm">{item.quantity}</span>
                        <EditItemQuantityButton item={item} type="plus" />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
          <aside className="self-start border border-[#c1cbb5] bg-[#e5e9dc] p-6">
            <h2 className="text-2xl">Your order</h2>
            {pricing && (
              <div className="mt-7 flex justify-between text-sm">
                <span>Cases at individual prices</span>
                <Price amount={pricing.regularSubtotal} />
              </div>
            )}
            {pricing && pricing.discount > 0 && (
              <div className="mt-4 flex justify-between gap-3 text-sm text-[#52663d]">
                <span className="flex items-center gap-2">
                  <Check size={15} /> Three-case offer
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
            {quantity % 3 !== 0 && (
              <Link
                href="/#build-your-three"
                className="mt-6 block text-sm underline underline-offset-4"
              >
                Add {3 - (quantity % 3)} more to complete {quantity > 3 ? 'your next' : 'your'} $50
                set ↗
              </Link>
            )}
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
