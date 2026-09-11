import type { ReactNode } from 'react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import React from 'react'

/**
 * Layout for the routes inherited from the Payload ecommerce template
 * (shop, checkout, account, auth, CMS pages). The cinematic storefront lives
 * in the sibling `(cinematic)` group with its own chrome.
 */
export default function TemplateLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}
