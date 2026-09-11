import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { ProductExperience } from '@/components/store/ProductExperience'
import { heroImage } from '@/components/store/catalog'
import { loadStorefront } from '@/lib/storefront/loadStorefront'
import { getDeviceClass } from '@/utilities/device'
import { getServerSideURL } from '@/utilities/getURL'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ device?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { design } = await loadStorefront({ slug })
  if (!design) return {}

  const siteName = process.env.SITE_NAME || 'Phone Case Store'
  const image = heroImage(design)

  return {
    title: `${design.title} | ${siteName}`,
    description: design.tagline,
    openGraph: image ? { images: [{ url: `${getServerSideURL()}${image}` }] } : undefined,
  }
}

/**
 * One URL, two component trees. The device class is decided on the server
 * so the client never ships both bundles or flashes the wrong one.
 */
export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, { device: deviceOverride }] = await Promise.all([params, searchParams])
  const [{ design, catalog, phoneModels }, device] = await Promise.all([
    loadStorefront({ slug }),
    getDeviceClass(deviceOverride),
  ])

  if (!design) return notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: design.title,
    description: design.tagline,
    image: heroImage(design) ? `${getServerSideURL()}${heroImage(design)}` : undefined,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: (Math.min(...design.variants.map((v) => v.price), design.price) / 100).toFixed(2),
      highPrice: (Math.max(...design.variants.map((v) => v.price), design.price) / 100).toFixed(2),
      availability: design.variants.length
        ? 'https://schema.org/InStock'
        : 'https://schema.org/PreOrder',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductExperience
        device={device}
        initialDesign={design}
        catalog={catalog}
        phoneModels={phoneModels}
      />
    </>
  )
}
