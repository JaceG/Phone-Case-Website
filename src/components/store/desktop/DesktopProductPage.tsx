'use client'

import React from 'react'

import type { ExperienceProps } from '../ProductExperience'
import { BuyBar } from './BuyBar'
import { CollectionRow } from './CollectionRow'
import { DetailsDesktop } from './DetailsDesktop'
import { EditorialHero } from './EditorialHero'
import { Turntable } from './Turntable'

/**
 * Desktop tree, editorial layout (Daily Hero 35 reference). Cursor-reactive
 * parallax, hover reveals, scroll-scrubbing.
 * The buy bar never leaves the viewport, so everything below the hero is
 * free to be browsed without costing conversion.
 */
export const DesktopProductPage: React.FC<ExperienceProps> = (props) => {
  const { design, selectedModel } = props
  return (
    <div className="pb-40">
      <EditorialHero key={design.slug} {...props} />
      <Turntable key={`tt-${design.slug}`} design={design} model={selectedModel} />
      <DetailsDesktop design={design} model={selectedModel} />
      <CollectionRow {...props} />
      <BuyBar {...props} />
    </div>
  )
}
