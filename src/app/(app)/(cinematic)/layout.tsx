import type { ReactNode } from 'react'
import React from 'react'

import { Grain } from '@/components/store/Grain'
import { SmoothScroll } from '@/components/store/SmoothScroll'
import { StoreHeader } from '@/components/store/StoreHeader'
import { StoreUIProvider } from '@/components/store/StoreUI'
import '@/components/store/store.css'

/**
 * Chrome for the cinematic storefront: near-black ground, Lenis smooth
 * scroll, film grain, and a minimal header. The template's header/footer
 * are deliberately absent here.
 */
export default function CinematicLayout({ children }: { children: ReactNode }) {
  return (
    <StoreUIProvider>
      <SmoothScroll>
        <div className="store-root">
          <StoreHeader />
          <main>{children}</main>
          <Grain />
        </div>
      </SmoothScroll>
    </StoreUIProvider>
  )
}
