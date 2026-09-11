'use client'

import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import React from 'react'

import type { ExperienceProps } from '../ProductExperience'
import { formatPrice, variantFor } from '../catalog'

type Props = ExperienceProps & { open: boolean; onClose: () => void }

/** Bottom sheet for picking the phone. Tap to select (with a haptic tick), drag down to dismiss. */
export const ModelSheet: React.FC<Props> = ({ design, phoneModels, selectedModel, selectModel, open, onClose }) => {
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 500) onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            key="scrim"
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="fixed inset-0 z-40 bg-[rgba(20,22,30,0.35)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal
            className="store-glass fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={onDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--store-line)]" />
            <h2 className="font-display text-[1.3rem] tracking-[0.1em]">Your phone</h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--store-muted)]">
              {design.title} · printed for the model you pick
            </p>

            <ul className="mt-5 divide-y divide-[var(--store-line)]">
              {phoneModels.map((m) => {
                const variant = variantFor(design, m)
                const active = selectedModel?.id === m.id
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      disabled={!variant}
                      onClick={() => {
                        if ('vibrate' in navigator) navigator.vibrate?.(8)
                        selectModel(m.id)
                        onClose()
                      }}
                      className="flex w-full items-center justify-between py-4 text-left disabled:opacity-40"
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className="inline-block h-4 w-4 rounded-full border"
                          style={{
                            borderColor: active ? 'var(--store-fg)' : 'var(--store-line)',
                            background: active ? 'var(--store-fg)' : 'transparent',
                          }}
                        />
                        <span className="font-body text-lg font-medium">{m.name}</span>
                      </span>
                      <span className="font-mono text-xs text-[var(--store-muted)]">
                        {variant ? formatPrice(variant.price) : 'Soon'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
