'use client'
import { createContext, useContext } from 'react'
import { useCart as useLiveCart } from '@payloadcms/plugin-ecommerce/client/react'
export const PreviewContext = createContext(false)
/** Product-page previews must never read or mutate the owner's shopping bag. */
export function useCart() {
  const live = useLiveCart(),
    preview = useContext(PreviewContext)
  if (!preview) return live
  const noop = async () => {}
  return {
    ...live,
    cart: undefined,
    isLoading: false,
    addItem: noop,
    removeItem: noop,
    incrementItem: noop,
    decrementItem: noop,
    clearCart: noop,
  } as unknown as typeof live
}
