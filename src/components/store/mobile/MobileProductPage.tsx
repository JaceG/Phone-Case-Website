'use client'

import { motion } from 'motion/react'
import React, { useState } from 'react'

import { RichText } from '@/components/RichText'

import { DeviceSwitch } from '../DeviceSwitch'
import { ModelSlider } from '../ModelSlider'
import type { ExperienceProps } from '../ProductExperience'
import { formatPrice, thumbImage } from '../catalog'
import { HeroSwipe } from './HeroSwipe'
import { MobileBuyBar } from './MobileBuyBar'
import { ModelSheet } from './ModelSheet'

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-10% 0px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
}

/**
 * Mobile tree. Tap, swipe, momentum, haptics. Swiping the hero switches
 * designs; the phone picker is a bottom sheet; the buy bar is thumb-reach.
 */
export const MobileProductPage: React.FC<ExperienceProps> = (props) => {
  const { design, catalog, switchDesign, openCatalog } = props
  const [sheetOpen, setSheetOpen] = useState(false)
  const others = catalog.filter((d) => d.slug !== design.slug)

  return (
    <div className="pb-32">
      <HeroSwipe {...props} />

      <section className="px-5 pt-2">
        <DeviceSwitch {...props} variant="chips" />
        <ModelSlider {...props} className="mt-6" />
      </section>

      <motion.section className="px-5 pt-10" {...reveal}>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--store-muted)]">
          {design.collections[0]?.title ?? 'Design'}
        </p>
        <p className="mt-3 font-serif text-3xl italic leading-tight text-[var(--store-accent)]">{design.tagline}</p>
        <div className="mt-6">
          {design.story ? (
            <RichText data={design.story} enableGutter={false} enableProse={false} className="store-prose text-base" />
          ) : null}
        </div>
      </motion.section>

      <motion.section className="px-5 pt-10" {...reveal}>
        <dl>
          <div className="store-spec">
            <dt>Case</dt>
            <dd>Liquid silicone · MagSafe</dd>
          </div>
          <div className="store-spec">
            <dt>Print</dt>
            <dd>UV DTF · full wrap</dd>
          </div>
          <div className="store-spec">
            <dt>Made</dt>
            <dd>To order, in-house</dd>
          </div>
          <div className="store-spec" style={{ borderBottom: '1px solid var(--store-line)' }}>
            <dt>Ships</dt>
            <dd>In days</dd>
          </div>
        </dl>
      </motion.section>

      {design.renders.threeQuarter && (
        <motion.figure className="px-5 pt-10" {...reveal}>
          <div
            className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-[var(--store-line)]"
            style={{ background: `radial-gradient(70% 70% at 50% 35%, ${design.palette[0] ?? '#111'}22 0%, var(--store-card) 100%)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={design.renders.threeQuarter}
              alt={`${design.title} edge wrap`}
              className="absolute inset-0 h-full w-full object-contain p-8"
              loading="lazy"
            />
          </div>
          <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--store-muted)]">
            Wrapped over every edge
          </figcaption>
        </motion.figure>
      )}

      {others.length > 0 && (
        <section className="pt-14">
          <div className="flex items-end justify-between px-5">
            <h2 className="font-display text-[1.5rem] leading-none tracking-[0.1em]">More designs</h2>
            <button type="button" onClick={openCatalog} className="store-pill font-mono text-[10px] uppercase tracking-[0.16em]">
              All
            </button>
          </div>
          <div className="store-hide-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
            {others.map((d) => {
              const img = thumbImage(d)
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    switchDesign(d.slug)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="w-[68vw] flex-none snap-start text-left"
                >
                  <div
                    className="relative aspect-[3/4] overflow-hidden rounded-[1.75rem] border border-[var(--store-line)]"
                    style={{ background: `radial-gradient(70% 70% at 50% 35%, ${d.palette[0] ?? '#111'}22 0%, var(--store-card) 100%)` }}
                  >
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={d.title} className="absolute inset-0 h-full w-full object-contain p-8" loading="lazy" />
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="font-display text-[0.95rem] tracking-[0.1em]">{d.title}</span>
                    <span className="font-mono text-xs text-[var(--store-muted)]">{formatPrice(d.price)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <MobileBuyBar {...props} onPickModel={() => setSheetOpen(true)} />
      <ModelSheet {...props} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
