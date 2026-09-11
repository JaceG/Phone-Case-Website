import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { ProductExperience } from '@/components/store/ProductExperience'
import { loadStorefront } from '@/lib/storefront/loadStorefront'
import { getDeviceClass } from '@/utilities/device'

/**
 * The home page is the featured design's landing page. Product pages are
 * landing pages; the catalog is reachable through the overlay, not dumped
 * on the front door.
 */

type Props = { searchParams: Promise<{ device?: string }> }

export async function generateMetadata(): Promise<Metadata> {
  const { design } = await loadStorefront()
  const siteName = process.env.SITE_NAME || 'Phone Case Store'
  return {
    title: design ? `${design.title} | ${siteName}` : siteName,
    description: design?.tagline,
  }
}

export default async function HomePage({ searchParams }: Props) {
  const { device: deviceOverride } = await searchParams
  const [{ design, catalog, phoneModels }, device] = await Promise.all([
    loadStorefront(),
    getDeviceClass(deviceOverride),
  ])

  if (!design) return notFound()

  return (
    <ProductExperience
      device={device}
      initialDesign={design}
      catalog={catalog}
      phoneModels={phoneModels}
    />
  )
}
