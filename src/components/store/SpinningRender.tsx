'use client'

import React, { useEffect, useRef, useState } from 'react'

import { CrossfadeImage } from './CrossfadeImage'

type Props = {
  /** Ordered turntable frames. Fewer than 2 falls back to `still`. */
  frames: string[]
  still: string | null
  alt: string
  className?: string
  imgClassName?: string
  /** Frames per second of the idle spin. */
  fps?: number
  /** Pause while the pointer is over the element. */
  pauseOnHover?: boolean
}

/**
 * The case, slowly turning. Plays the pre-rendered turntable sequence so the
 * hero product rotates in place without WebGL. Frames are preloaded; until
 * they are, the hero still shows.
 */
export const SpinningRender: React.FC<Props> = ({
  frames,
  still,
  alt,
  className,
  imgClassName,
  fps = 9,
  pauseOnHover = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [paused, setPaused] = useState(false)
  const frameRef = useRef(0)
  const ready = images.length > 1

  useEffect(() => {
    if (frames.length < 2) {
      setImages([])
      return
    }
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
    ).then((loaded) => {
      if (!cancelled) setImages(loaded.filter((i) => i.naturalWidth > 0))
    })
    return () => {
      cancelled = true
    }
  }, [frames])

  useEffect(() => {
    if (!ready) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const img = images[frameRef.current % images.length]
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
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
    }

    draw()
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      if (paused) return
      if (now - last >= 1000 / fps) {
        last = now
        frameRef.current = (frameRef.current + 1) % images.length
        draw()
      }
    }
    raf = requestAnimationFrame(step)
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [fps, images, paused, ready])

  return (
    <div
      className={['relative', className].filter(Boolean).join(' ')}
      onPointerEnter={() => pauseOnHover && setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      {ready ? (
        <canvas ref={canvasRef} role="img" aria-label={alt} className={imgClassName} />
      ) : (
        still && <CrossfadeImage src={still} alt={alt} imgClassName={imgClassName} fetchPriority="high" />
      )}
    </div>
  )
}
