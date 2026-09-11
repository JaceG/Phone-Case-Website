'use client'
import { Product, Variant } from '@/payload-types'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

type Props = {
  product: Product
}

/**
 * Print on demand: there is no stock count to show. Once a phone model is
 * picked we tell the customer the case is made for them.
 */
export const StockIndicator: React.FC<Props> = ({ product }) => {
  const searchParams = useSearchParams()

  const variants = product.variants?.docs || []

  const selectedVariant = useMemo<Variant | undefined>(() => {
    if (product.enableVariants && variants.length) {
      const variantId = searchParams.get('variant')
      const validVariant = variants.find((variant) => {
        if (typeof variant === 'object') {
          return String(variant.id) === variantId
        }
        return String(variant) === variantId
      })

      if (validVariant && typeof validVariant === 'object') {
        return validVariant
      }
    }

    return undefined
  }, [product.enableVariants, searchParams, variants])

  if (product.enableVariants && !selectedVariant) {
    return (
      <div className="uppercase font-mono text-sm font-medium text-gray-500">
        <p>Select your phone</p>
      </div>
    )
  }

  return (
    <div className="uppercase font-mono text-sm font-medium text-gray-500">
      <p>Printed to order</p>
    </div>
  )
}
