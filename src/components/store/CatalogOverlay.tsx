'use client'

import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useMemo } from 'react'

import type { CatalogDesign } from './catalog'
import { formatPrice, thumbImage } from './catalog'

type Props = {
  open: boolean
  onClose: () => void
  catalog: CatalogDesign[]
  activeSlug: string
  onSelect: (slug: string) => void
}

/**
 * The catalog lives behind a button, not on the product page. Grouped by
 * collection; picking a design swaps it into the page underneath.
 */
export const CatalogOverlay: React.FC<Props> = ({ open, onClose, catalog, activeSlug, onSelect }) => {
  const groups = useMemo(() => {
    const map = new Map<string, { title: string; designs: CatalogDesign[] }>()
    for (const d of catalog) {
      const key = d.collections[0]?.title ?? 'All designs'
      if (!map.has(key)) map.set(key, { title: key, designs: [] })
      map.get(key)!.designs.push(d)
    }
    return Array.from(map.values())
  }, [catalog])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="catalog"
          className="fixed inset-0 z-40 overflow-y-auto bg-[var(--store-bg-2)]/95 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mx-auto max-w-[1400px] px-5 pb-32 pt-24 md:px-10 md:pt-28">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--store-muted)]">
              {catalog.length} designs · one case · your phone
            </p>

            {groups.map((group, gi) => (
              <section key={group.title} className="mt-10 md:mt-14">
                <h2 className="font-display text-[1.6rem] leading-none tracking-[0.1em] md:text-[2.4rem]">{group.title}</h2>
                <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                  {group.designs.map((d, i) => {
                    const img = thumbImage(d)
                    const active = d.slug === activeSlug
                    return (
                      <motion.li
                        key={d.id}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * (gi * 4 + i), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <button
                          type="button"
                          onClick={() => onSelect(d.slug)}
                          className="group block w-full text-left"
                          aria-current={active ? 'true' : undefined}
                        >
                          <div
                            className="relative aspect-[3/4] overflow-hidden border shadow-[0_14px_30px_rgba(20,22,30,0.14)] transition-colors"
                            style={{
                              borderColor: active ? 'var(--store-accent)' : 'rgba(255,255,255,0.5)',
                              background: `radial-gradient(60% 60% at 50% 40%, ${d.palette[0] ?? '#111'}22 0%, var(--store-card) 100%)`,
                            }}
                          >
                            {img && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={img}
                                alt={d.title}
                                className="absolute inset-0 h-full w-full object-contain p-6 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                                loading="lazy"
                              />
                            )}
                          </div>
                          <div className="mt-3 flex items-baseline justify-between">
                            <span className="font-display text-[0.95rem] tracking-[0.1em]">{d.title}</span>
                            <span className="font-mono text-xs text-[var(--store-muted)]">
                              {formatPrice(d.price)}
                            </span>
                          </div>
                          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--store-muted)]">
                            {d.tagline}
                          </p>
                        </button>
                      </motion.li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
