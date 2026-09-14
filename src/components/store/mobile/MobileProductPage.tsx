'use client'
import { useState } from 'react'
import type { ExperienceProps } from '../ProductExperience'
import { SelectionBar } from '../BundleBuilder'
import { DesignLanding } from '../DesignLanding'
import { HeroSwipe } from './HeroSwipe'
import { ModelSheet } from './ModelSheet'

export function MobileProductPage(props: ExperienceProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  return (
    <div className="mobile-storefront">
      <HeroSwipe {...props} />
      <button className="mobile-phone-choice" type="button" onClick={() => setSheetOpen(true)}>
        {props.selectedModel?.name ?? 'Choose your phone'} <span>Change ↗</span>
      </button>
      <DesignLanding {...props} mobile />
      <SelectionBar {...props} onNeedsModel={() => setSheetOpen(true)} />
      <ModelSheet {...props} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
