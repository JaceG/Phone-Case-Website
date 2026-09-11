'use client'

import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import React, { useState } from 'react'

import { AddToCartButton } from '../AddToCartButton'
import type { ExperienceProps } from '../ProductExperience'
import { formatPrice, variantFor } from '../catalog'

/**
 * Persistent sticky buy bar. Design name, phone model, price, add to cart.
 * The hero carries its own CTA and model picker, so the bar slides in once
 * the hero scrolls away and then never leaves the viewport.
 */
export const BuyBar: React.FC<ExperienceProps> = ({ design, phoneModels, selectedModel, selectModel }) => {
  const variant = variantFor(design, selectedModel)
  const price = variant?.price ?? design.price
  const { scrollY } = useScroll()
  const [pastHero, setPastHero] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setPastHero(y > window.innerHeight * 0.7))

  return (
    <motion.div
      className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-6"
      initial={false}
      animate={pastHero ? { y: 0, opacity: 1, pointerEvents: 'auto' } : { y: 80, opacity: 0, pointerEvents: 'none' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="store-glass flex w-full max-w-[1100px] items-center gap-4 py-2.5 pl-6 pr-2.5">
        <div className="hidden min-w-[7rem] flex-none lg:block">
          <div className="font-display text-[15px] leading-none tracking-[0.1em]">{design.title}</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--store-muted)]">
            {selectedModel ? selectedModel.name : 'Pick your phone'}
          </div>
        </div>

        <div className="hidden h-8 w-px flex-none bg-[var(--store-line)] lg:block" />

        <div className="store-hide-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {phoneModels.map((m) => {
            const available = Boolean(variantFor(design, m))
            const active = selectedModel?.id === m.id
            return (
              <button
                key={m.id}
                type="button"
                data-active={active}
                disabled={!available}
                title={available ? m.name : `${m.name} · coming soon`}
                onClick={() => selectModel(active ? null : m.id)}
                className="store-pill whitespace-nowrap font-body text-[11px] uppercase tracking-[0.08em]"
              >
                {m.name}
              </button>
            )
          })}
        </div>

        <div className="h-8 w-px flex-none bg-[var(--store-line)]" />

        <div className="flex-none font-body text-[15px] font-medium tabular-nums">{formatPrice(price)}</div>

        <div className="flex-none">
          <AddToCartButton design={design} model={selectedModel} />
        </div>
      </div>
    </motion.div>
  )
}
