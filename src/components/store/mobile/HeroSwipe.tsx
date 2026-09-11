'use client'

import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import React, { useCallback, useMemo, useState } from 'react'

import { CrossfadeImage } from '../CrossfadeImage'
import type { ExperienceProps } from '../ProductExperience'
import { heroImageFor } from '../catalog'

/**
 * Full-height hero you swipe. Left/right moves through the catalog with
 * momentum; the artwork slides, the case stays put in your hand.
 */
export const HeroSwipe: React.FC<ExperienceProps> = ({ design, catalog, switchDesign, selectedModel }) => {
  const index = useMemo(() => catalog.findIndex((d) => d.slug === design.slug), [catalog, design.slug])
  const [direction, setDirection] = useState(0)

  const go = useCallback(
    (delta: number) => {
      if (catalog.length < 2) return
      const next = (index + delta + catalog.length) % catalog.length
      setDirection(delta)
      switchDesign(catalog[next].slug)
    },
    [catalog, index, switchDesign],
  )

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const swipe = info.offset.x + info.velocity.x * 0.2
      if (swipe < -80) go(1)
      else if (swipe > 80) go(-1)
    },
    [go],
  )

  const image = heroImageFor(design, selectedModel)
  const accent = design.palette[1] ?? '#c08f6d'

  return (
    <section className="relative flex min-h-[100dvh] flex-col justify-end overflow-hidden px-5 pb-32 pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-[background] duration-700"
        style={{ background: `radial-gradient(70% 50% at 50% 35%, rgba(255,255,255,0.55) 0%, ${accent}22 40%, rgba(0,0,0,0) 80%)` }}
      />

      <div className="relative flex flex-1 items-center justify-center">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.figure
            key={design.slug}
            custom={direction}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: direction * 120, rotate: direction * 6 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: direction * -120, rotate: direction * -6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="flex touch-pan-y items-center justify-center"
          >
            {image ? (
              <CrossfadeImage
                src={image}
                alt={`${design.title} phone case`}
                className="pointer-events-none"
                imgClassName="max-h-[54vh] w-auto drop-shadow-[20px_30px_40px_rgba(20,22,30,0.4)]"
              />
            ) : (
              <div className="aspect-[3/4] w-56 rounded-[2rem] border border-[var(--store-line)]" />
            )}
          </motion.figure>
        </AnimatePresence>
      </div>

      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--store-muted)]">
          {index + 1} / {catalog.length} · swipe
        </p>
        <motion.h1
          key={`title-${design.slug}`}
          className="font-display mt-2 text-[clamp(1.9rem,9vw,3rem)] leading-[1.05] tracking-[0.1em]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {design.title}
        </motion.h1>
        <div className="mt-4 flex gap-1.5">
          {catalog.map((d, i) => (
            <button
              key={d.id}
              type="button"
              aria-label={d.title}
              onClick={() => {
                setDirection(i > index ? 1 : -1)
                switchDesign(d.slug)
              }}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 28 : 10,
                background: i === index ? 'var(--store-fg)' : 'var(--store-line)',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
