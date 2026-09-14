'use client'

import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import React, { useCallback, useState } from 'react'
import { toast } from 'sonner'

import type { CatalogDesign, CatalogPhoneModel } from './catalog'
import { variantFor } from './catalog'

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
  const { addItem, isLoading } = useCart()
  const [addedDesign, setAddedDesign] = useState<number | null>(null)
  const added = addedDesign === design.id
  const variant = variantFor(design, model)

  const onClick = useCallback(async () => {
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
  }, [addItem, design.id, design.title, model?.name, onNeedsModel, variant, reviewAfterAdd])

  const label = !model
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
      disabled={isLoading || (Boolean(model) && !variant)}
      className={className ?? 'store-cta'}
      aria-label={label}
    >
      {label}
    </button>
  )
}
