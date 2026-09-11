import React from 'react'

/** Fixed film-grain overlay. Pure SVG noise, no asset, no JS. Multiplied over the light ground. */
export const Grain: React.FC = () => (
  <svg
    aria-hidden
    className="pointer-events-none fixed inset-0 z-[60] h-full w-full opacity-[0.05] mix-blend-multiply"
    xmlns="http://www.w3.org/2000/svg"
  >
    <filter id="store-grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#store-grain)" />
  </svg>
)
