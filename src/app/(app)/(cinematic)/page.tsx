import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { ProductExperience } from '@/components/store/ProductExperience'
import { loadStorefront } from '@/lib/storefront/loadStorefront'
import { withLocalArtworkPreview } from '@/lib/storefront/localArtworkPreview'
import { getDeviceClass } from '@/utilities/device'

/**
 * The home page is the featured design's landing page. Product pages are
 * landing pages; the catalog is reachable through the overlay, not dumped
 * on the front door.
 */

type Props = { searchParams: Promise<{ device?: string; artworkPreview?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { artworkPreview } = await searchParams
  const { design } = await withLocalArtworkPreview(await loadStorefront(), artworkPreview)
  const siteName = process.env.SITE_NAME || 'Phone Case Store'
  return {
    title: design ? `${design.title} | ${siteName}` : siteName,
    description: design?.tagline,
    ...(artworkPreview === '1' ? { robots: { index: false, follow: false } } : {}),
  }
}

export default async function HomePage({ searchParams }: Props) {
  const { device: deviceOverride, artworkPreview } = await searchParams
  const [{ design, catalog, phoneModels }, device] = await Promise.all([
    loadStorefront().then((storefront) => withLocalArtworkPreview(storefront, artworkPreview)),
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
