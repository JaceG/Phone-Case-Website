'use client'

import React from 'react'

import type { ExperienceProps } from './ProductExperience'
import { FAMILIES, FAMILY_LABEL, familyOf, thumbImageFor, type DeviceFamily } from './catalog'

type Props = Pick<ExperienceProps, 'design' | 'phoneModels' | 'family' | 'selectFamily'> & {
  /** 'tiles' for the desktop hero, 'chips' for mobile. */
  variant?: 'tiles' | 'chips'
  className?: string
}

/**
 * The two device families as thumbnails of the current design. Picking one
 * crossfades the big render and narrows the model slider to that family.
 */
export const DeviceSwitch: React.FC<Props> = ({
  design,
  phoneModels,
  family,
  selectFamily,
  variant = 'tiles',
  className,
}) => {
  const tiles = FAMILIES.map((f: DeviceFamily) => {
    const models = phoneModels.filter((m) => familyOf(m) === f)
    const representative = models.find((m) => m.status === 'active') ?? models[0] ?? null
    return { family: f, models, image: thumbImageFor(design, representative) }
  }).filter((t) => t.models.length > 0)

  if (tiles.length < 2) return null

  if (variant === 'chips') {
    return (
      <div className={['flex gap-2', className].filter(Boolean).join(' ')} role="tablist" aria-label="Device">
        {tiles.map((t) => (
          <button
            key={t.family}
            type="button"
            role="tab"
            aria-selected={family === t.family}
            data-active={family === t.family}
            onClick={() => selectFamily(t.family)}
            className="store-pill flex-1 justify-center gap-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em]"
          >
            {t.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.image} alt="" className="h-7 w-auto" draggable={false} />
            )}
            {FAMILY_LABEL[t.family]}
            <span className="opacity-50">{t.models.length}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={['flex gap-3', className].filter(Boolean).join(' ')} role="tablist" aria-label="Device">
      {tiles.map((t) => {
        const active = family === t.family
        return (
          <button
            key={t.family}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => selectFamily(t.family)}
            className="group w-28 text-left"
          >
            <div
              className="relative aspect-[4/5] overflow-hidden rounded-2xl border transition-colors duration-300"
              style={{
                borderColor: active ? 'var(--store-fg)' : 'var(--store-line)',
                background: `radial-gradient(70% 70% at 50% 35%, ${design.palette[0] ?? '#111'} 0%, var(--store-bg) 100%)`,
              }}
            >
              {t.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.image}
                  alt={`${design.title} on ${FAMILY_LABEL[t.family]}`}
                  className="absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                  draggable={false}
                />
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
              <span className={active ? 'text-[var(--store-fg)]' : 'text-[var(--store-muted)]'}>
                {FAMILY_LABEL[t.family]}
              </span>
              <span className="text-[var(--store-muted)]">{t.models.length}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
