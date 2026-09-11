'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'

type StoreUI = {
  catalogOpen: boolean
  setCatalogOpen: (open: boolean) => void
}

const Ctx = createContext<StoreUI>({ catalogOpen: false, setCatalogOpen: () => {} })

export const StoreUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [catalogOpen, setCatalogOpen] = useState(false)
  const value = useMemo(() => ({ catalogOpen, setCatalogOpen }), [catalogOpen])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStoreUI = () => useContext(Ctx)
