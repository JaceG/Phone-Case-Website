'use client'

import dynamic from 'next/dynamic'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { AddToCartButton } from '../AddToCartButton'
import { CrossfadeImage } from '../CrossfadeImage'
import { ModelSlider } from '../ModelSlider'
import type { ExperienceProps } from '../ProductExperience'
import { SpinningRender, frontLingers } from '../SpinningRender'
import {
  FAMILIES,
  FAMILY_LABEL,
  familyOf,
  heroImageFor,
  rendersFor,
  storyText,
  thumbImage,
  thumbImageFor,
  type DeviceFamily,
} from '../catalog'

/**
 * Desktop hero rebuilt from the Daily Hero 35 reference.
 *
 * The reference is a fixed 1440×810 composition, so this is one too: a
 * stage at those dimensions, every element at its Figma pixel position,
 * scaled uniformly to fit the viewport. That keeps the composition intact
 * at any window size instead of letting percentages collide.
 *
 *   headline        design title, wide tracked display face
 *   second row      collection word · tagline (small serif) · device family (copper serif)
 *   rule + para     story excerpt
 *   block + link    add to cart · turn it over
 *   product         the render, large, right of centre, cursor-reactive
 *   right stack     the staggered thumbnails = iPhone / Android / all designs
 *   card            model picker: rotated render, model name, slider
 */

const ModelHero = dynamic(() => import('../ModelHero').then((m) => m.ModelHero), { ssr: false })

const STAGE_W = 1440
const STAGE_H = 810

// The front of the case is what sells; edges and back are a formality.
// Linger only while the front faces the viewer (±50°), turn 38× faster
// everywhere else — one continuous motion, just uneven. Loop length set so
// the front passes at what used to be the fast speed (Jace, 2026-09-11).
const idleSpeed = frontLingers(37.6, 0.14)

const useStageScale = () => {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const update = () =>
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return scale
}

export const EditorialHero: React.FC<ExperienceProps> = (props) => {
  const {
    design,
    catalog,
    switchDesign,
    phoneModels,
    family,
    selectFamily,
    selectedModel,
    openCatalog,
  } = props
  const scale = useStageScale()

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.6 })
  const sy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.6 })
  const imgX = useTransform(sx, [-1, 1], [-22, 22])
  const imgY = useTransform(sy, [-1, 1], [-14, 14])
  const rotY = useTransform(sx, [-1, 1], [-5, 5])
  const rotX = useTransform(sy, [-1, 1], [4, -4])

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const r = e.currentTarget.getBoundingClientRect()
      mx.set(((e.clientX - r.left) / r.width) * 2 - 1)
      my.set(((e.clientY - r.top) / r.height) * 2 - 1)
    },
    [mx, my],
  )
  const onLeave = useCallback(() => {
    mx.set(0)
    my.set(0)
  }, [mx, my])

  const image = heroImageFor(design, selectedModel)
  const sequences = rendersFor(design, selectedModel)
  // The idle motion is the tumble (two-axis precession); the plain turntable
  // is the fallback until a tumble has been rendered for this design.
  const idleFrames = sequences.tumble.length > 1 ? sequences.tumble : sequences.turntable
  const secondLine = (design.collections[0]?.title ?? 'Case').split(' ')[0]
  const excerpt = useMemo(() => storyText(design, 150), [design])

  const familyModels = phoneModels.filter((m) => familyOf(m) === family)
  const modelIndex = Math.max(
    0,
    familyModels.findIndex((m) => m.id === selectedModel?.id),
  )

  const tiles = FAMILIES.map((f: DeviceFamily) => {
    const models = phoneModels.filter((m) => familyOf(m) === f)
    const rep = models.find((m) => m.status === 'active') ?? models[0] ?? null
    return {
      key: f as string,
      label: FAMILY_LABEL[f],
      image: thumbImageFor(design, rep),
      active: family === f,
      onClick: () => selectFamily(f),
    }
  })
  tiles.push({
    key: 'all',
    label: 'All designs',
    image: thumbImage(design),
    active: false,
    onClick: openCatalog,
  })

  const scrollToTurntable = () =>
    document.getElementById('turntable')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const enter = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
  })

  return (
    <section
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="store-ground relative h-[100dvh] min-h-[560px] overflow-hidden"
    >
      {/* Scaled 1440×810 stage */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
          perspective: 1600,
        }}
      >
        {/* Headline */}
        <motion.h1
          className="font-display absolute left-[101px] top-[184px] whitespace-nowrap text-[65px] leading-none tracking-[7px] text-[var(--store-fg)]"
          style={{ fontSize: Math.min(65, 1000 / Math.max(design.title.length, 1)) }}
          {...enter(0.05)}
        >
          {design.title}
        </motion.h1>

        {/* Second row: collection word · tagline · family */}
        <motion.div
          className="absolute left-[16px] top-[252px] flex items-start gap-[26px]"
          {...enter(0.15)}
        >
          <p className="font-display whitespace-nowrap text-[65px] leading-none tracking-[7px] text-[var(--store-fg)]">
            {secondLine}
          </p>
          <p className="font-serif mt-[16px] w-[112px] text-[12px] font-semibold uppercase leading-[1.4] tracking-[-0.07em] text-[var(--store-fg)]">
            {design.tagline}
          </p>
          <motion.p
            key={family}
            className="font-serif whitespace-nowrap text-[74px] font-semibold lowercase leading-[0.84] tracking-[-0.07em] text-[var(--store-accent)]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {FAMILY_LABEL[family]}
          </motion.p>
        </motion.div>

        {/* Rule + excerpt */}
        <motion.div className="absolute left-[21px] top-[373px] flex gap-[28px]" {...enter(0.3)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/store/icons/rule.svg"
            alt=""
            width={4}
            height={24}
            className="h-6 w-1"
            draggable={false}
          />
          <p className="font-body w-[160px] text-[14px] leading-[1.3] text-[var(--store-fg)]">
            {excerpt}
          </p>
        </motion.div>

        {/* Block CTA + text link */}
        <motion.div
          className="absolute left-[301px] top-[409px] flex items-center gap-[50px]"
          {...enter(0.35)}
        >
          <AddToCartButton design={design} model={selectedModel} className="store-cta" />
          <button type="button" onClick={scrollToTurntable} className="store-link">
            See the details
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/store/icons/play.svg"
              alt=""
              width={26}
              height={26}
              className="h-[26px] w-[26px]"
              draggable={false}
            />
          </button>
        </motion.div>

        <div className="hero-offer absolute left-[301px] top-[488px] z-20">
          <a href="#build-your-three">
            Build your three · $50 <span>Mix any designs ↗</span>
          </a>
          <div role="group" aria-label="Preview another design">
            {catalog.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.title}
                aria-label={`Preview ${item.title}`}
                aria-pressed={item.id === design.id}
                onClick={() => switchDesign(item.slug)}
                style={{ backgroundColor: item.palette[0] ?? '#aaa' }}
              />
            ))}
          </div>
        </div>

        {/* Product: the reference's 704px frame, right edge at 56px */}
        <motion.figure
          className="absolute right-[56px] top-0 flex h-[810px] w-[704px] items-center justify-center"
          style={{ x: imgX, y: imgY, rotateY: rotY, rotateX: rotX, transformStyle: 'preserve-3d' }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Approved geometry and the default frame sequence share the same hero cadence. */}
          {sequences.geometry && sequences.texture ? (
            <ModelHero
              key={`${sequences.geometry}:${sequences.texture}`}
              geometry={sequences.geometry}
              texture={sequences.texture}
              silicone={sequences.silicone}
              still={image}
              alt={`${design.title} phone case${selectedModel ? ` for ${selectedModel.name}` : ''}`}
            />
          ) : (
            <SpinningRender
              frames={idleFrames}
              framePhases={idleFrames === sequences.tumble ? sequences.tumblePhases : null}
              still={image}
              alt={`${design.title} phone case${selectedModel ? ` for ${selectedModel.name}` : ''}`}
              className="h-[760px] w-[704px]"
              imgClassName="h-[760px] w-[704px] drop-shadow-[30px_50px_60px_rgba(20,22,30,0.45)]"
              loopSeconds={3.55}
              speedProfile={idleSpeed}
            />
          )}
        </motion.figure>

        {/* Right-edge stack: iPhone / Android / all designs (Figma: left 1200, top 425, 240×385) */}
        <motion.div
          className="absolute left-[1200px] top-[425px] h-[385px] w-[240px]"
          {...enter(0.45)}
        >
          {tiles.map((t, i) => {
            const pos = [
              { left: 120, top: 0 },
              { left: 0, top: 129 },
              { left: 120, top: 257 },
            ][i]
            return (
              <button
                key={t.key}
                type="button"
                onClick={t.onClick}
                aria-pressed={t.key !== 'all' ? t.active : undefined}
                title={t.label}
                className="group absolute h-[128px] w-[120px] overflow-hidden bg-[var(--store-card)] shadow-[0_14px_30px_rgba(20,22,30,0.18)] transition-transform duration-300 hover:-translate-y-0.5"
                style={{
                  left: pos.left,
                  top: pos.top,
                  outline: t.active
                    ? '2px solid var(--store-accent)'
                    : '1px solid rgba(255,255,255,0.5)',
                  outlineOffset: -1,
                }}
              >
                {t.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.image}
                    alt={t.label}
                    className="absolute inset-0 h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                    draggable={false}
                  />
                )}
                <span className="font-body absolute bottom-1.5 left-2 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--store-fg)]">
                  {t.label}
                </span>
              </button>
            )
          })}
        </motion.div>

        {/* Bottom-left card: model picker (Figma: left 187, top 577, 501×233) */}
        <motion.div
          className="absolute left-[187px] top-[577px] flex h-[233px] w-[501px]"
          {...enter(0.5)}
        >
          <div className="relative -ml-[57px] flex w-[57px] flex-col items-center justify-end pb-3">
            <span className="font-display -rotate-90 whitespace-nowrap text-[12px] opacity-40">
              {String(familyModels.length).padStart(2, '0')}
            </span>
            <span className="font-display mt-10 -rotate-90 whitespace-nowrap text-[32px] tracking-[-0.03em] opacity-40">
              {String(modelIndex + 1).padStart(2, '0')}
            </span>
          </div>
          <div className="store-card relative h-[233px] w-[240px] flex-none overflow-hidden">
            {image && (
              <CrossfadeImage
                src={image}
                alt=""
                className="absolute inset-0"
                imgClassName="absolute left-1/2 top-1/2 h-[150%] w-auto -translate-x-1/2 -translate-y-1/2 rotate-[26.66deg]"
              />
            )}
          </div>
          <div className="ml-[27px] flex w-[177px] flex-col justify-between py-1">
            <div>
              <p className="font-body text-[18px] font-medium uppercase leading-none text-[var(--store-fg)]">
                {selectedModel?.name ?? 'Choose your phone'}
              </p>
              <p className="font-body mt-3 text-[14px] leading-[1.3] text-[var(--store-fg)]">
                Printed to order for the exact model. Slide to pick yours.
              </p>
            </div>
            <ModelSlider {...props} className="w-full" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
