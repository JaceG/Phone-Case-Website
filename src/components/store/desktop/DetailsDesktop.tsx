'use client'

import { motion } from 'motion/react'
import React from 'react'

import { RichText } from '@/components/RichText'

import { CrossfadeImage } from '../CrossfadeImage'
import type { CatalogDesign, CatalogPhoneModel } from '../catalog'
import { rendersFor } from '../catalog'

type Props = { design: CatalogDesign; model: CatalogPhoneModel | null }

const reveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-15% 0px' },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
}

/**
 * The story and the object. Hover on either render reveals the other view.
 */
export const DetailsDesktop: React.FC<Props> = ({ design, model }) => {
  const { threeQuarter, flat } = rendersFor(design, model)
  const [deep = '#111114'] = design.palette

  return (
    <section id="details" className="mx-auto grid max-w-[1400px] grid-cols-12 gap-10 px-10 py-32">
      <motion.div className="col-span-5" {...reveal}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--store-muted)]">
          The design
        </p>
        <h2 className="font-display mt-4 text-[2.6rem] leading-none tracking-[0.1em]">{design.title}</h2>
        <div className="mt-8">
          {design.story ? (
            <RichText data={design.story} enableGutter={false} enableProse={false} className="store-prose" />
          ) : (
            <p className="store-prose">{design.tagline}</p>
          )}
        </div>

        <dl className="mt-14">
          <div className="store-spec">
            <dt>Case</dt>
            <dd>Liquid silicone · MagSafe</dd>
          </div>
          <div className="store-spec">
            <dt>Print</dt>
            <dd>UV DTF · full wrap</dd>
          </div>
          <div className="store-spec">
            <dt>Finish</dt>
            <dd>Soft-touch matte</dd>
          </div>
          <div className="store-spec">
            <dt>Made</dt>
            <dd>To order, in-house</dd>
          </div>
          <div className="store-spec" style={{ borderBottom: '1px solid var(--store-line)' }}>
            <dt>Palette</dt>
            <dd className="flex justify-end gap-2">
              {design.palette.map((hex) => (
                <span
                  key={hex}
                  title={hex}
                  className="inline-block h-3.5 w-3.5 rounded-full border border-[var(--store-line)]"
                  style={{ background: hex }}
                />
              ))}
            </dd>
          </div>
        </dl>
      </motion.div>

      <motion.div className="col-span-7 grid grid-cols-2 gap-6" {...reveal} transition={{ ...reveal.transition, delay: 0.1 }}>
        {[threeQuarter, flat].map((src, i) => (
          <figure
            key={i}
            className="group relative aspect-[3/4] overflow-hidden border border-white/50 shadow-[0_18px_40px_rgba(20,22,30,0.14)]"
            style={{ background: `radial-gradient(70% 70% at 50% 35%, ${deep}22 0%, var(--store-card) 100%)` }}
          >
            {src && (
              <CrossfadeImage
                src={src}
                alt={`${design.title} ${i === 0 ? 'three-quarter' : 'flat'} view`}
                className="absolute inset-0"
                imgClassName="absolute inset-0 h-full w-full object-contain p-10 transition-transform duration-700 ease-out group-hover:scale-[1.06]"
              />
            )}
            <figcaption className="absolute bottom-5 left-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--store-muted)] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {i === 0 ? 'Edge wrap' : 'Print face'}
            </figcaption>
          </figure>
        ))}
      </motion.div>
    </section>
  )
}
