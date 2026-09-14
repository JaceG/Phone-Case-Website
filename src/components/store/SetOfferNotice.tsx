'use client'

import { CASE_OFFER } from '@/lib/commerce/bundlePricing'
import { formatPrice } from './catalog'

/** Describe the complete-set target, separately from the actual payable subtotal. */
export function SetOfferNotice({ quantity, subtotal }: { quantity: number; subtotal: number }) {
  const complete = quantity > 0 && quantity % CASE_OFFER.quantity === 0
  const sets = Math.floor(quantity / CASE_OFFER.quantity)
  const remaining = CASE_OFFER.quantity - (quantity % CASE_OFFER.quantity)
  const nextTotal = (sets + 1) * CASE_OFFER.price
  const difference = nextTotal - subtotal
  return (
    <div className="set-offer-notice" aria-live="polite">
      <strong>
        {complete
          ? `${sets} ${sets === 1 ? 'set' : 'sets'} complete · ${formatPrice(subtotal)}`
          : quantity === 0
            ? 'Your first three · $50'
            : `Choose ${remaining} more · ${quantity + remaining} cases for ${formatPrice(nextTotal)}`}
      </strong>
      <p>
        {complete
          ? 'Keep them, share them, or build another set of three for $50.'
          : quantity === 0
            ? 'Mix designs and phone models. Each complete set of three is $50.'
            : difference < 0
              ? `Complete the set and your subtotal drops by ${formatPrice(-difference)}.`
              : difference === 0
                ? 'Complete the set without increasing your subtotal.'
                : `Complete the set for ${formatPrice(difference)} more than your current subtotal.`}
      </p>
    </div>
  )
}
