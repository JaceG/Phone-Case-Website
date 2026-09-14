'use client'

import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { useEffect, useState } from 'react'
import { ArrowRight, Check, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { ExperienceProps } from './ProductExperience'
import { AddToCartButton } from './AddToCartButton'
import { formatPrice, thumbImageFor, variantFor } from './catalog'
import { useStoreUI } from './StoreUI'
import { SetOfferNotice } from './SetOfferNotice'
import { AddCaseForPhone } from '@/components/Cart/AddCaseForPhone'

export const openShoppingBag = () => window.dispatchEvent(new Event('store:open-cart'))
export const choosePhone = () => {
  document
    .getElementById('build-your-three')
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  document.getElementById('case-phone')?.focus({ preventScroll: true })
}

function useSelection() {
  const { cart, decrementItem, isLoading } = useCart()
  const { nextSetFrom, setNextSetFrom } = useStoreUI()
  const items = cart?.items ?? []
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  // Only expand the current three slots, even when a line has a large quantity.
  const newSet = count > 0 && count % 3 === 0 && nextSetFrom === count
  const start = newSet ? count : count ? Math.floor((count - 1) / 3) * 3 : 0
  const slots: typeof items = []
  let cursor = 0
  for (const item of items) {
    const end = cursor + item.quantity
    for (let index = Math.max(cursor, start); index < Math.min(end, start + 3); index++)
      slots.push(item)
    cursor = end
  }
  return {
    cart,
    count,
    slots,
    setNumber: start / 3 + 1,
    ready: count > 0 && count % 3 === 0 && !newSet,
    newSet,
    startNextSet: () => setNextSetFrom(count),
    cancelNextSet: () => setNextSetFrom(null),
    isLoading,
    removeOne: async (id: string) => {
      try {
        await decrementItem(id)
      } catch {
        toast.error('Could not update your selection. Please try again.')
      }
    },
  }
}

export function BundleBuilder(props: ExperienceProps) {
  const { catalog, design, selectedModel, phoneModels, selectModel, switchDesign } = props
  const {
    count,
    slots,
    removeOne,
    isLoading,
    cart,
    setNumber,
    ready,
    newSet,
    startNextSet,
    cancelNextSet,
  } = useSelection()
  const selectedPrice = variantFor(design, selectedModel)?.price ?? design.price
  return (
    <section className="bundle-builder" id="build-your-three" aria-labelledby="bundle-heading">
      <div className="bundle-intro">
        <span className="editorial-kicker">A little rotation looks good on you</span>
        <h2 id="bundle-heading">
          One phone.
          <br />
          <em>Three moods.</em>
        </h2>
        <p>
          Pick your everyday, your going-out, and your just-because. Mix any three cases for{' '}
          <strong>$50.</strong>
        </p>
        <p className="bundle-sharing-note">
          All yours. Or a few to share. Mix phone models in the same set.
        </p>
        <div className="bundle-set-ladder" aria-label="Set pricing">
          {[1, 2, 3].map((sets) => (
            <span key={sets}>
              <strong>{sets * 3} cases</strong>${sets * 50}
            </span>
          ))}
        </div>
        <p className="bundle-single-note">
          Prefer one? Every design is also available individually.
        </p>
      </div>
      <div className="bundle-controls">
        <div className="bundle-heading-row">
          <span>Set {setNumber} · $50</span>
          <strong aria-live="polite">
            {ready ? 'Your set is complete' : `${slots.length} of 3 selected`}
          </strong>
        </div>
        <SetOfferNotice quantity={count} subtotal={cart?.subtotal ?? 0} />
        {newSet && (
          <div className="bundle-new-set-note">
            <span>Your {count} cases are still in your bag. This set adds $50 when complete.</span>
            <button type="button" onClick={cancelNextSet}>
              Back to my completed set
            </button>
          </div>
        )}
        <div className="bundle-slots">
          {[0, 1, 2].map((index) => {
            const item = slots[index]
            const product = item && typeof item.product === 'object' ? item.product : null
            const match = catalog.find((d) => d.id === (product?.id ?? item?.product))
            const src = match && thumbImageFor(match, null)
            const option =
              item && typeof item.variant === 'object' ? item.variant?.options?.[0] : null
            return (
              <div
                className="bundle-slot"
                data-filled={Boolean(item)}
                key={`${index}-${item?.id ?? 'empty'}`}
              >
                {item ? (
                  <>
                    {src && (
                      <img
                        src={src}
                        alt={product?.title ?? match?.title ?? 'Selected case'}
                        loading="lazy"
                      />
                    )}
                    <span>{product?.title ?? match?.title ?? 'Case'}</span>
                    <small>{typeof option === 'object' ? option?.label : 'Phone selected'}</small>
                    <button
                      type="button"
                      disabled={isLoading}
                      className="bundle-remove"
                      aria-label={`Remove one ${product?.title ?? 'case'}`}
                      onClick={() => item.id && void removeOne(item.id)}
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById('design-picker')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                    aria-label={`Choose case ${index + 1}`}
                  >
                    <Plus size={23} />
                    <span>Case {index + 1}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <label className="bundle-phone" htmlFor="case-phone">
          <span>Phone for the next case</span>
          <select
            id="case-phone"
            value={selectedModel?.id ?? ''}
            onChange={(event) =>
              selectModel(event.target.value ? Number(event.target.value) : null)
            }
          >
            <option value="">Choose your phone model</option>
            {phoneModels
              .filter((model) => variantFor(design, model))
              .map((model) => (
                <option value={model.id} key={model.id}>
                  {model.name}
                </option>
              ))}
          </select>
        </label>
        <p className="bundle-phone-help">
          Choosing for someone else? Change the phone here. Cases already in your bag keep their
          models.
        </p>
        <div
          className="bundle-design-picker"
          id="design-picker"
          role="group"
          aria-label="Choose a design"
        >
          {catalog.map((d) => {
            const inBag =
              cart?.items?.reduce(
                (total, item) =>
                  total +
                  ((typeof item.product === 'object' ? item.product?.id : item.product) === d.id
                    ? item.quantity
                    : 0),
                0,
              ) ?? 0
            return (
              <button
                type="button"
                aria-pressed={d.id === design.id}
                key={d.id}
                onClick={() => switchDesign(d.slug)}
              >
                <span style={{ background: d.palette[0] ?? '#aaa' }} />
                {d.title}
                {inBag > 0 && <small>{inBag} in bag</small>}
                {d.id === design.id && <Check size={13} />}
              </button>
            )
          })}
        </div>
        {cart?.items?.some(
          (item) =>
            (typeof item.product === 'object' ? item.product?.id : item.product) === design.id,
        ) && (
          <AddCaseForPhone
            key={design.id}
            productId={design.id}
            title={design.title}
            options={phoneModels.flatMap((model) => {
              if (model.status !== 'active') return []
              const variant = variantFor(design, model)
              return variant
                ? [
                    {
                      variantId: variant.id,
                      phoneModelId: model.id,
                      name: model.name,
                      price: variant.price,
                    },
                  ]
                : []
            })}
          />
        )}
        <div className="bundle-actions">
          {ready ? (
            <button type="button" className="store-cta" disabled={isLoading} onClick={startNextSet}>
              Build another set · $50 <Plus size={16} />
            </button>
          ) : (
            <AddToCartButton
              design={design}
              model={selectedModel}
              label={`Add ${design.title}`}
              onNeedsModel={choosePhone}
            />
          )}
          {count > 0 && (
            <button type="button" className="store-cta bundle-review" onClick={openShoppingBag}>
              Review bag <ArrowRight size={17} />
            </button>
          )}
        </div>
        <div className="bundle-price-note" aria-live="polite">
          <span>
            {ready || newSet
              ? `${count} cases · ${formatPrice(cart?.subtotal ?? 0)} subtotal`
              : count === 0
                ? 'Any 3 cases · $50 total'
                : `${count} ${count === 1 ? 'case' : 'cases'} in bag · ${formatPrice(cart?.subtotal ?? 0)} current subtotal`}
          </span>
          <AddToCartButton
            design={design}
            model={selectedModel}
            className="bundle-single"
            label={`${count ? 'Add one individually' : 'Just this one'} · ${formatPrice(selectedPrice)}`}
            reviewAfterAdd
            onNeedsModel={choosePhone}
          />
        </div>
        <p className="bundle-terms">
          The offer applies automatically to every complete set of three. Additional cases use their
          individual price until your next set is complete. Shipping and tax are separate.
        </p>
      </div>
    </section>
  )
}

export function SelectionBar({
  design,
  selectedModel,
  onNeedsModel,
}: ExperienceProps & { onNeedsModel?: () => void }) {
  const { count, slots, ready, setNumber, startNextSet } = useSelection()
  const [pastHero, setPastHero] = useState(false)
  useEffect(() => {
    const update = () => setPastHero(window.scrollY > window.innerHeight * 0.65)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return (
    <aside className="selection-bar" data-past-hero={pastHero} aria-label="Your case selection">
      <button
        className="selection-progress"
        onClick={() =>
          document
            .getElementById('build-your-three')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        type="button"
      >
        <span className="selection-dots" aria-hidden>
          {[0, 1, 2].map((i) => (
            <i key={i} data-filled={Boolean(slots[i])}>
              {slots[i] ? <Check size={12} /> : i + 1}
            </i>
          ))}
        </span>
        <span>
          <strong>
            {ready
              ? `${count / 3} ${count === 3 ? 'set' : 'sets'} complete`
              : `Set ${setNumber} · $50`}
          </strong>
          <small aria-live="polite">
            {ready
              ? `${count} selected · ready to review`
              : `${slots.length}/3 selected · mix your designs`}
          </small>
        </span>
      </button>
      <div className="selection-current">
        <strong>{design.title}</strong>
        <span>{selectedModel?.name ?? 'Choose your phone'}</span>
      </div>
      {ready ? (
        <button
          type="button"
          className="store-cta"
          onClick={() => {
            startNextSet()
            document
              .getElementById('build-your-three')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        >
          Another set · $50
        </button>
      ) : (
        <AddToCartButton
          design={design}
          model={selectedModel}
          label="Add this design"
          onNeedsModel={onNeedsModel ?? choosePhone}
        />
      )}
      {count > 0 && (
        <button type="button" className="selection-bag" onClick={openShoppingBag}>
          Bag ({count}) <ArrowRight size={17} />
        </button>
      )}
    </aside>
  )
}
