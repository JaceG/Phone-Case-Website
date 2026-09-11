'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

import { CrossfadeImage } from './CrossfadeImage'

type Props = {
  /** Ordered loop frames; frame 0 faces the viewer. Fewer than 2 falls back to `still`. */
  frames: string[]
  /** Loop phase (0–1) of each frame when they are not evenly spaced. Omit for uniform spacing. */
  framePhases?: number[] | null
  still: string | null
  alt: string
  className?: string
  imgClassName?: string
  /** Seconds for one full loop (after the speed profile is normalised). */
  loopSeconds?: number
  /**
   * Relative angular speed as a function of loop phase (0 = frame 0 facing
   * the viewer, 0.5 = the back). Return 1 everywhere for a constant turn.
   * The loop still takes `loopSeconds` overall; the profile only shifts
   * time from some angles to others.
   */
  speedProfile?: (phase: number) => number
  /** Pause while the pointer is over the element. */
  pauseOnHover?: boolean
}

const constantSpeed = () => 1

/**
 * The case, slowly turning. Plays a pre-rendered loop on a canvas so the hero
 * product rotates in place without WebGL. Playback advances by *angle*, not
 * by frame count, so a speed profile can make the front linger and the back
 * pass quickly while the motion stays continuous.
 */
export const SpinningRender: React.FC<Props> = ({
  frames,
  still,
  alt,
  className,
  imgClassName,
  framePhases,
  loopSeconds = 6,
  speedProfile = constantSpeed,
  pauseOnHover = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [paused, setPaused] = useState(false)
  const phaseRef = useRef(0)
  const ready = images.length > 1

  // Normalise so the whole loop takes `loopSeconds` regardless of the profile:
  // dphase/dt = rate · profile(phase), with rate chosen from ∫ dphase / profile.
  const rate = useMemo(() => {
    const n = 512
    let integral = 0
    for (let i = 0; i < n; i++) {
      const p = (i + 0.5) / n
      integral += 1 / Math.max(speedProfile(p), 1e-3) / n
    }
    return integral / loopSeconds
  }, [loopSeconds, speedProfile])

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

    // Phase → frame. Uniform frames index directly; uneven frames (denser
    // where playback is slow) take the last frame whose phase ≤ current.
    const phases = framePhases && framePhases.length === images.length ? framePhases : null
    const frameFor = (phase: number) => {
      if (!phases) return Math.floor(phase * images.length) % images.length
      let lo = 0
      let hi = phases.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (phases[mid] <= phase) lo = mid
        else hi = mid - 1
      }
      return lo
    }

    let lastFrame = -1
    const draw = (force = false) => {
      const index = frameFor(phaseRef.current)
      if (!force && index === lastFrame) return
      lastFrame = index
      const img = images[index]
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

    draw(true)
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (paused) return
      const p = phaseRef.current
      phaseRef.current = (p + rate * Math.max(speedProfile(p), 1e-3) * dt) % 1
      draw()
    }
    raf = requestAnimationFrame(step)
    const onResize = () => draw(true)
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [framePhases, images, paused, rate, ready, speedProfile])

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

/**
 * Slow only while the front faces the viewer. `halfWidth` is how far either
 * side of dead-front (as a fraction of the loop; 0.14 ≈ ±50°) the slow window
 * reaches; outside it the case turns at `boost`× that speed, so edge-on and
 * back views pass quickly. The window is a raised cosine, so speed never jumps.
 */
export const frontLingers =
  (boost = 3, halfWidth = 0.14) =>
  (phase: number) => {
    const d = Math.min(phase, 1 - phase) // distance to phase 0, wrapped
    if (d >= halfWidth) return boost
    const window = 0.5 * (1 + Math.cos((Math.PI * d) / halfWidth)) // 1 at front → 0 at the edge of the window
    return boost - (boost - 1) * window
  }
