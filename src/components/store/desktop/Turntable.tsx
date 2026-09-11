'use client'

import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { CrossfadeImage } from '../CrossfadeImage'
import type { CatalogDesign, CatalogPhoneModel } from '../catalog'
import { heroImageFor, rendersFor } from '../catalog'

type Props = { design: CatalogDesign; model: CatalogPhoneModel | null }

/**
 * Scroll-scrubbed turntable. A frame sequence is drawn to a canvas as the
 * section pins; with no frames yet, the hero render rotates in 3D instead
 * so the section still reads as "turn the case over".
 */
export const Turntable: React.FC<Props> = ({ design, model }) => {
  const ref = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frames = rendersFor(design, model).turntable
  const hasFrames = frames.length > 1

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const frameIndex = useTransform(scrollYProgress, [0, 1], [0, Math.max(frames.length - 1, 0)])
  const rotate = useTransform(scrollYProgress, [0, 1], [-25, 25])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1, 0.92])
  const copyOpacity = useTransform(scrollYProgress, [0, 0.35, 0.65, 1], [0, 1, 1, 0])

  const [images, setImages] = useState<HTMLImageElement[]>([])
  useEffect(() => {
    if (!hasFrames) return
    let cancelled = false
    Promise.all(
      frames.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = () => resolve(img)
            img.src = src
          }),
      ),
    ).then((loaded) => !cancelled && setImages(loaded))
    return () => {
      cancelled = true
    }
  }, [frames, hasFrames])

  const draw = useMemo(
    () => (i: number) => {
      const canvas = canvasRef.current
      const img = images[Math.round(i)]
      if (!canvas || !img || !img.naturalWidth) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const s = Math.min(w / img.naturalWidth, h / img.naturalHeight)
      const dw = img.naturalWidth * s
      const dh = img.naturalHeight * s
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
    },
    [images],
  )

  useMotionValueEvent(frameIndex, 'change', draw)
  useEffect(() => draw(frameIndex.get()), [draw, frameIndex])

  const image = heroImageFor(design, model)

  return (
    <section ref={ref} id="turntable" className="relative h-[260vh]">
      <div className="sticky top-0 flex h-[100dvh] items-center justify-center overflow-hidden">
        <motion.p
          className="font-display absolute left-10 top-1/2 max-w-xs -translate-y-1/2 text-[1.35rem] leading-snug tracking-[0.08em]"
          style={{ opacity: copyOpacity }}
        >
          Full-bleed print. Wrapped over every edge, across the camera step, into the corners.
        </motion.p>

        {hasFrames ? (
          <canvas ref={canvasRef} className="h-[80vh] w-[80vh] max-w-full" />
        ) : (
          <motion.div style={{ rotateY: rotate, scale, perspective: 1200, transformStyle: 'preserve-3d' }}>
            {image && <CrossfadeImage src={image} alt="" imgClassName="max-h-[80vh] w-auto" />}
          </motion.div>
        )}

        <motion.p
          className="absolute bottom-10 right-10 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--store-muted)]"
          style={{ opacity: copyOpacity }}
        >
          {hasFrames ? `${frames.length} frames · scroll to rotate` : 'Turntable renders pending'}
        </motion.p>
      </div>
    </section>
  )
}
