'use client'

import { motion } from 'motion/react'
import React from 'react'

import { AddToCartButton } from '../AddToCartButton'
import type { ExperienceProps } from '../ProductExperience'
import { formatPrice, variantFor } from '../catalog'

type Props = ExperienceProps & { onPickModel: () => void }

/** Thumb-reach buy bar. Price and phone on the left, one action on the right. */
export const MobileBuyBar: React.FC<Props> = ({ design, selectedModel, onPickModel }) => {
  const variant = variantFor(design, selectedModel)
  const price = variant?.price ?? design.price

  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="store-glass flex items-center justify-between gap-3 rounded-full py-2.5 pl-5 pr-2.5">
        <button type="button" onClick={onPickModel} className="min-w-0 flex-1 text-left">
          <div className="font-mono text-sm tabular-nums">{formatPrice(price)}</div>
          <div className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--store-muted)]">
            {selectedModel ? `${selectedModel.name} · change` : 'Choose your phone'}
          </div>
        </button>
        <AddToCartButton design={design} model={selectedModel} onNeedsModel={onPickModel} />
      </div>
    </motion.div>
  )
}
