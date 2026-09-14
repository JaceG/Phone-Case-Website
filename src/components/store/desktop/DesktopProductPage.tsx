'use client'
import type { ExperienceProps } from '../ProductExperience'
import { SelectionBar } from '../BundleBuilder'
import { DesignLanding } from '../DesignLanding'
import { EditorialHero } from './EditorialHero'

export function DesktopProductPage(props: ExperienceProps) {
  return (
    <div className="desktop-storefront">
      <EditorialHero key={props.design.slug} {...props} />
      <DesignLanding {...props} />
      <SelectionBar {...props} />
    </div>
  )
}
