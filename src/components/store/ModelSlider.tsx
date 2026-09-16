'use client'

import { motion } from 'motion/react'
import React, { useCallback, useMemo, useRef } from 'react'

import type { ExperienceProps } from './ProductExperience'
import { familyOf, variantFor, groupPhoneModels } from './catalog'

type Props = Pick<
  ExperienceProps,
  'design' | 'phoneModels' | 'family' | 'selectedModel' | 'selectModel'
> & {
  className?: string
}

/**
 * A rail with one stop per model in the current family. Click a stop, drag
 * the knob, or use the arrow keys; the selection snaps to the nearest model
 * and the big render, price and buy bar follow.
 */
export const ModelSlider: React.FC<Props> = ({
  design,
  phoneModels,
  family,
  selectedModel,
  selectModel,
  className,
}) => {
  const railRef = useRef<HTMLDivElement>(null)
  const models = useMemo(
    () => phoneModels.filter((m) => familyOf(m) === family),
    [family, phoneModels],
  )
  const index = Math.max(
    0,
    models.findIndex((m) => m.id === selectedModel?.id),
  )
  const count = models.length
  const pct = count > 1 ? (index / (count - 1)) * 100 : 50

  const pick = useCallback(
    (i: number) => {
      const m = models[Math.min(Math.max(i, 0), count - 1)]
      if (m && m.id !== selectedModel?.id) {
        if ('vibrate' in navigator) navigator.vibrate?.(5)
        selectModel(m.id)
      }
    },
    [count, models, selectModel, selectedModel?.id],
  )

  const fromPointer = useCallback(
    (clientX: number) => {
      const rail = railRef.current
      if (!rail || count < 2) return
      const r = rail.getBoundingClientRect()
      const t = Math.min(Math.max((clientX - r.left) / r.width, 0), 1)
      pick(Math.round(t * (count - 1)))
    },
    [count, pick],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      fromPointer(e.clientX)
    },
    [fromPointer],
  )
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.buttons & 1) fromPointer(e.clientX)
    },
    [fromPointer],
  )
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        pick(index + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        pick(index - 1)
      } else if (e.key === 'Home') pick(0)
      else if (e.key === 'End') pick(count - 1)
    },
    [count, index, pick],
  )

  if (count === 0) return null

  return (
    <div className={['select-none', className].filter(Boolean).join(' ')}>
      <label className="mb-2 block font-body text-xs">
        <span className="sr-only">Choose your phone model</span>
        <select
          aria-label="Choose your phone model"
          value={selectedModel?.id ?? ''}
          onChange={(event) => selectModel(event.target.value ? Number(event.target.value) : null)}
          className="w-full min-w-0 rounded border border-[var(--store-line)] bg-[var(--store-bg)] px-2 py-2 text-[var(--store-fg)]"
        >
          <option value="">Choose your phone</option>
          {groupPhoneModels(models).map(([group, entries]) => (
            <optgroup key={group} label={group}>
              {entries.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div
        ref={railRef}
        role="slider"
        tabIndex={0}
        aria-label="Phone model"
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={index}
        aria-valuetext={models[index]?.name}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="relative h-8 cursor-ew-resize touch-none outline-none"
      >
        {/* rail */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--store-line)]" />
        {/* stops */}
        {models.map((m, i) => {
          const stopAvailable = Boolean(variantFor(design, m))
          return (
            <span
              key={m.id}
              className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${count > 1 ? (i / (count - 1)) * 100 : 50}%`,
                background: stopAvailable ? 'var(--store-fg)' : 'var(--store-line)',
                opacity: i === index ? 0 : 0.7,
              }}
            />
          )
        })}
        {/* knob */}
        <motion.span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--store-fg)] bg-[var(--store-bg)]"
          animate={{ left: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          style={{ boxShadow: '0 0 0 4px rgba(10,10,11,0.8)' }}
        />
      </div>

      <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--store-muted)]">
        <span>{models[0]?.name}</span>
        {count > 1 && <span>{models[count - 1]?.name}</span>}
      </div>
    </div>
  )
}
