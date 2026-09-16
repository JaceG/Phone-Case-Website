'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { DeviceClass } from '@/utilities/device'

import { CatalogOverlay } from './CatalogOverlay'
import type { CatalogDesign, CatalogPhoneModel, DeviceFamily } from './catalog'
import { familyOf, variantFor } from './catalog'
import { DesktopProductPage } from './desktop/DesktopProductPage'
import { MobileProductPage } from './mobile/MobileProductPage'
import { useStoreUI } from './StoreUI'

export type ExperienceProps = {
  design: CatalogDesign
  catalog: CatalogDesign[]
  phoneModels: CatalogPhoneModel[]
  selectedModel: CatalogPhoneModel | null
  selectModel: (id: number | null) => void
  /** Device family currently shown (iPhone / Android), even before a model is picked. */
  family: DeviceFamily
  selectFamily: (family: DeviceFamily) => void
  switchDesign: (slug: string) => void
  openCatalog: () => void
}

type Props = {
  device: DeviceClass
  initialDesign: CatalogDesign
  catalog: CatalogDesign[]
  phoneModels: CatalogPhoneModel[]
}

const STORAGE_KEY = 'store:phoneModel'

/**
 * Owns the state both trees share: which design is on screen, which device
 * family is shown, and which phone model is selected. Switching designs
 * swaps artwork in place and rewrites the URL without a navigation, so
 * browsing and buying stay one interaction.
 */
export const ProductExperience: React.FC<Props> = ({
  device,
  initialDesign,
  catalog,
  phoneModels,
}) => {
  const [slug, setSlug] = useState(initialDesign.slug)
  const [modelId, setModelId] = useState<number | null>(null)
  const [familyState, setFamilyState] = useState<DeviceFamily>('iphone')
  // Last model picked within each family, so flipping iPhone ↔ Android and back restores it.
  const lastInFamily = useRef<Partial<Record<DeviceFamily, number>>>({})
  const { catalogOpen, setCatalogOpen } = useStoreUI()

  useEffect(() => setSlug(initialDesign.slug), [initialDesign.slug])
  useEffect(() => {
    const restore = () => {
      const pathSlug = window.location.pathname.split('/products/')[1]?.split('/')[0]
      setSlug(catalog.find((d) => d.slug === pathSlug)?.slug ?? initialDesign.slug)
    }
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [catalog, initialDesign.slug])

  const design = useMemo(
    () => catalog.find((d) => d.slug === slug) ?? initialDesign,
    [catalog, initialDesign, slug],
  )
  const selectedModel = useMemo(
    () => phoneModels.find((m) => m.id === modelId) ?? null,
    [modelId, phoneModels],
  )
  const family: DeviceFamily = selectedModel ? familyOf(selectedModel) : familyState

  useEffect(() => {
    document.title = `${design.title} | ${process.env.NEXT_PUBLIC_SITE_NAME || 'Phone Case Store'}`
  }, [design.title])

  // Remember the phone across visits: it is the one thing that never changes for a customer.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      const model = phoneModels.find((m) => String(m.id) === saved)
      if (model) {
        setModelId(model.id)
        setFamilyState(familyOf(model))
        lastInFamily.current[familyOf(model)] = model.id
      }
    } catch {}
  }, [phoneModels])

  const selectModel = useCallback(
    (id: number | null) => {
      setModelId(id)
      const model = phoneModels.find((m) => m.id === id)
      if (model) {
        setFamilyState(familyOf(model))
        lastInFamily.current[familyOf(model)] = model.id
      }
      try {
        if (id === null) window.localStorage.removeItem(STORAGE_KEY)
        else window.localStorage.setItem(STORAGE_KEY, String(id))
      } catch {}
    },
    [phoneModels],
  )

  const selectFamily = useCallback(
    (next: DeviceFamily) => {
      setFamilyState(next)
      const inFamily = phoneModels.filter((m) => familyOf(m) === next)
      const remembered = inFamily.find((m) => m.id === lastInFamily.current[next])
      const firstBuyable = inFamily.find((m) => variantFor(design, m))
      const pick = remembered ?? firstBuyable ?? inFamily[0]
      if (pick) selectModel(pick.id)
      else setModelId(null)
    },
    [design, phoneModels, selectModel],
  )

  const switchDesign = useCallback(
    (next: string) => {
      if (next === slug) return
      const target = catalog.find((d) => d.slug === next)
      if (!target) return
      setSlug(next)
      const query = new URLSearchParams(window.location.search)
      window.history.pushState(
        window.history.state,
        '',
        `/products/${next}${query.size ? `?${query}` : ''}`,
      )
      document.title = `${target.title} | ${process.env.NEXT_PUBLIC_SITE_NAME || 'Phone Case Store'}`
      if ('vibrate' in navigator) navigator.vibrate?.(6)
    },
    [catalog, slug],
  )

  const openCatalog = useCallback(() => setCatalogOpen(true), [setCatalogOpen])

  const shared: ExperienceProps = {
    design,
    catalog,
    phoneModels,
    selectedModel,
    selectModel,
    family,
    selectFamily,
    switchDesign,
    openCatalog,
  }

  return (
    <>
      {device === 'mobile' ? <MobileProductPage {...shared} /> : <DesktopProductPage {...shared} />}
      <CatalogOverlay
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        catalog={catalog}
        activeSlug={design.slug}
        selectedModel={selectedModel}
        onSelect={(s) => {
          switchDesign(s)
          setCatalogOpen(false)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    </>
  )
}
