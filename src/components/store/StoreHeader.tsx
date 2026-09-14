'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'

import { Cart } from '@/components/Cart'
import { useStoreUI } from './StoreUI'

/**
 * Editorial nav from the reference: mark left, hairline-separated uppercase
 * links centre-left, search + menu glyphs right. Search opens the catalog
 * overlay; the menu glyph is the cart.
 */
export const StoreHeader: React.FC = () => {
  const { catalogOpen, setCatalogOpen } = useStoreUI()
  const pathname = usePathname()
  const router = useRouter()
  const isProduct = pathname === '/' || pathname.startsWith('/products/')
  const sectionLink = (hash: string) => (isProduct ? hash : `/${hash}`)
  const browse = () => {
    if (isProduct) setCatalogOpen(!catalogOpen)
    else router.push('/#collection')
  }
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Case'

  const links: { label: string; onClick?: () => void; href?: string; active?: boolean }[] = [
    { label: 'Designs', onClick: browse },
    { label: 'How it works', href: sectionLink('#how-it-works') },
    { label: 'Questions', href: sectionLink('#questions') },
  ]

  return (
    <header className="store-header fixed inset-x-0 top-0 z-50 flex items-center px-5 py-4 md:px-8">
      <Link href="/" className="flex items-center gap-2" aria-label={siteName}>
        {/* eight-point mark */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          aria-hidden
          className="text-[var(--store-fg)]"
        >
          <path
            d="M13 1l2.2 7.1L22 5l-3.1 6.8L26 13l-7.1 1.2L22 21l-6.8-3.1L13 25l-1.2-7.1L5 21l3.1-6.8L1 13l7.1-1.2L5 5l6.8 3.1z"
            fill="currentColor"
          />
        </svg>
      </Link>

      <nav className="ml-10 hidden items-center md:flex" aria-label="Primary">
        {links.map((l, i) => (
          <React.Fragment key={l.label}>
            {i > 0 && <span className="mx-5 h-2 w-px bg-[var(--store-fg)]/60" aria-hidden />}
            {l.href ? (
              <Link href={l.href} className="store-nav-link" data-active={l.active}>
                {l.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={l.onClick}
                className="store-nav-link"
                data-active={l.active}
              >
                {l.label}
              </button>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-6">
        <a className="header-offer" href={sectionLink('#build-your-three')}>
          3 cases for $50 <span>↗</span>
        </a>
        <button
          type="button"
          onClick={browse}
          aria-expanded={catalogOpen}
          aria-label={catalogOpen ? 'Close designs' : 'Browse designs'}
          className="flex h-6 w-6 items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/store/icons/search.svg" alt="" width={18} height={18} draggable={false} />
        </button>
        <div className="store-cart">
          <Cart />
        </div>
      </div>
    </header>
  )
}
