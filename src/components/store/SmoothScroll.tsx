'use client'

import Lenis from 'lenis'
import React, { useEffect } from 'react'

/**
 * Lenis smooth scrolling for the cinematic tree. Scroll-scrubbed sections
 * read `window.scrollY` through motion's useScroll, which Lenis keeps in
 * sync, so nothing else needs to know it exists.
 */
export const SmoothScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Touch devices get native momentum; Lenis only smooths wheel/trackpad.
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, syncTouch: false })
    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
