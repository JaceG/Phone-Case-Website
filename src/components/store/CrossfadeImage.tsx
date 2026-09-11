'use client'

import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useRef, useState } from 'react'

type Props = {
  src: string | null
  alt: string
  className?: string
  imgClassName?: string
  duration?: number
  fetchPriority?: 'high' | 'low' | 'auto'
}

/**
 * An image that cross-dissolves when its `src` changes instead of popping.
 * The current image sits in normal flow (so the box keeps its size); the
 * outgoing one is layered on top and fades away. Because every phone model
 * is rendered with the same camera and light, this reads as the case
 * changing shape in place.
 */
export const CrossfadeImage: React.FC<Props> = ({
  src,
  alt,
  className,
  imgClassName,
  duration = 0.55,
  fetchPriority,
}) => {
  const [previous, setPrevious] = useState<string | null>(null)
  const lastSrc = useRef(src)

  useEffect(() => {
    if (lastSrc.current !== src) {
      setPrevious(lastSrc.current)
      lastSrc.current = src
    }
  }, [src])

  return (
    // The wrapper must be a containing block for the outgoing layer. Callers
    // that position it themselves (absolute/fixed) pass that in `className`;
    // otherwise it is `relative` so it keeps its place in flow.
    <div className={className && /\b(absolute|fixed|sticky|relative)\b/.test(className) ? className : ['relative', className].filter(Boolean).join(' ')}>
      {src ? (
        <motion.img
          key={src}
          src={src}
          alt={alt}
          className={imgClassName}
          draggable={false}
          fetchPriority={fetchPriority}
          initial={{ opacity: previous ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration, ease: 'easeOut' }}
        />
      ) : null}
      <AnimatePresence>
        {previous && previous !== src && (
          <motion.img
            key={`prev-${previous}`}
            src={previous}
            alt=""
            aria-hidden
            className={['pointer-events-none absolute inset-0', imgClassName].filter(Boolean).join(' ')}
            draggable={false}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration, ease: 'easeIn' }}
            onAnimationComplete={() => setPrevious(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
