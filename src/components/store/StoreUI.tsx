'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useCart } from '@/components/store/PreviewCart'

type StoreUI = {
  catalogOpen: boolean
  setCatalogOpen: (open: boolean) => void
  nextSetFrom: number | null
  setNextSetFrom: (quantity: number | null) => void
}

const Ctx = createContext<StoreUI>({
  catalogOpen: false,
  setCatalogOpen: () => {},
  nextSetFrom: null,
  setNextSetFrom: () => {},
})

export const StoreUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [nextSetFrom, setNextSetFrom] = useState<number | null>(null)
  const { cart } = useCart()
  const quantity = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  // Opening a new set is only browsing. The next cart edit ends that empty draft.
  useEffect(() => setNextSetFrom(null), [cart?.id, quantity])
  const value = useMemo(
    () => ({ catalogOpen, setCatalogOpen, nextSetFrom, setNextSetFrom }),
    [catalogOpen, nextSetFrom],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStoreUI = () => useContext(Ctx)
