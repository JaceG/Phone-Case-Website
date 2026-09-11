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
}

export const AddToCartButton: React.FC<Props> = ({ design, model, className, onNeedsModel }) => {
  const { addItem, isLoading } = useCart()
  const [added, setAdded] = useState(false)
  const variant = variantFor(design, model)

  const onClick = useCallback(async () => {
    if (!variant) {
      onNeedsModel?.()
      return
    }
    try {
      await addItem({ product: design.id, variant: variant.id })
      setAdded(true)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(10)
      toast.success(`${design.title} for ${model?.name} added`)
      setTimeout(() => setAdded(false), 1800)
    } catch {
      toast.error('Could not add to cart')
    }
  }, [addItem, design.id, design.title, model?.name, onNeedsModel, variant])

  const label = !model ? 'Choose your phone' : !variant ? 'Coming soon' : added ? 'Added' : 'Add to cart'

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
