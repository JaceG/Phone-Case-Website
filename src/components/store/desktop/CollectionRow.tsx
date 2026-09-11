'use client'

import { motion } from 'motion/react'
import React, { useMemo } from 'react'

import type { ExperienceProps } from '../ProductExperience'
import { formatPrice, thumbImage } from '../catalog'

/**
 * "Other designs in this collection". Same case, different art: clicking
 * swaps the artwork in place and scrolls back to the top.
 */
export const CollectionRow: React.FC<ExperienceProps> = ({ design, catalog, switchDesign, openCatalog }) => {
  const collectionId = design.collections[0]?.id
  const siblings = useMemo(() => {
    const inCollection = catalog.filter(
      (d) => d.slug !== design.slug && (collectionId == null || d.collections.some((c) => c.id === collectionId)),
    )
    return inCollection.length ? inCollection : catalog.filter((d) => d.slug !== design.slug)
  }, [catalog, collectionId, design.slug])

  if (!siblings.length) return null

  return (
    <section className="px-10 py-24">
      <div className="mb-10 flex items-end justify-between">
        <h2 className="font-display text-[2.2rem] leading-none tracking-[0.1em]">
          {design.collections[0] ? `More from ${design.collections[0].title}` : 'More designs'}
        </h2>
        <button type="button" onClick={openCatalog} className="store-pill font-mono text-[11px] uppercase tracking-[0.18em]">
          Everything
        </button>
      </div>

      <div className="store-hide-scrollbar -mx-10 flex gap-6 overflow-x-auto px-10 pb-4">
        {siblings.map((d, i) => {
          const img = thumbImage(d)
          return (
            <motion.button
              key={d.id}
              type="button"
              onClick={() => {
                switchDesign(d.slug)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="group w-[22rem] flex-none text-left"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="relative aspect-[3/4] overflow-hidden border border-white/50 shadow-[0_18px_40px_rgba(20,22,30,0.14)] transition-shadow duration-300 group-hover:shadow-[0_24px_50px_rgba(20,22,30,0.22)]"
                style={{ background: `radial-gradient(70% 70% at 50% 35%, ${d.palette[0] ?? '#111'}22 0%, var(--store-card) 100%)` }}
              >
                {img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={d.title}
                    className="absolute inset-0 h-full w-full object-contain p-10 transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="font-display text-[1.1rem] tracking-[0.1em]">{d.title}</span>
                <span className="font-mono text-xs text-[var(--store-muted)]">{formatPrice(d.price)}</span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}
