'use client'

import { useCart, PreviewContext } from '@/components/store/PreviewCart'
import React, { useCallback, useState } from 'react'
import { toast } from 'sonner'

import type { CatalogDesign, CatalogPhoneModel } from './catalog'
import { variantFor } from './catalog'
import { useStoreUI } from './StoreUI'

type Props = {
  design: CatalogDesign
  model: CatalogPhoneModel | null
  className?: string
  onNeedsModel?: () => void
  label?: string
  reviewAfterAdd?: boolean
}

export const AddToCartButton: React.FC<Props> = ({
  design,
  model,
  className,
  onNeedsModel,
  label: actionLabel,
  reviewAfterAdd,
}) => {
  const preview = React.useContext(PreviewContext)
  const { addItem, isLoading, cart } = useCart()
  const { nextSetFrom, setNextSetFrom } = useStoreUI()
  const count = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const startAnotherSet = !reviewAfterAdd && count > 0 && count % 3 === 0 && nextSetFrom !== count
  const [addedDesign, setAddedDesign] = useState<number | null>(null)
  const added = addedDesign === design.id
  const variant = variantFor(design, model)

  const onClick = useCallback(async () => {
    if (startAnotherSet) {
      setNextSetFrom(count)
      document
        .getElementById('build-your-three')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!variant) {
      if (onNeedsModel) onNeedsModel()
      else {
        document
          .getElementById('build-your-three')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        document.getElementById('case-phone')?.focus({ preventScroll: true })
      }
      return
    }
    try {
      await addItem({ product: design.id, variant: variant.id })
      setAddedDesign(design.id)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(10)
      toast.success(`${design.title} for ${model?.name} added`)
      if (reviewAfterAdd) window.dispatchEvent(new Event('store:open-cart'))
      setTimeout(() => setAddedDesign(null), 1800)
    } catch {
      toast.error('Could not add to cart')
    }
  }, [
    addItem,
    design.id,
    design.title,
    model?.name,
    onNeedsModel,
    variant,
    reviewAfterAdd,
    startAnotherSet,
    setNextSetFrom,
    count,
  ])

  const label = startAnotherSet
    ? 'Build another set · $50'
    : !model
      ? 'Choose your phone'
      : !variant
        ? 'Coming soon'
        : added
          ? 'Added ✓'
          : (actionLabel ?? 'Add this design')

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={preview || isLoading || (!startAnotherSet && Boolean(model) && !variant)}
      className={className ?? 'store-cta'}
      aria-label={label}
    >
      {label}
    </button>
  )
}
