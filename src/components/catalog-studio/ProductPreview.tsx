'use client'
import { ProductExperience } from '@/components/store/ProductExperience'
import { StoreUIProvider } from '@/components/store/StoreUI'
import { PreviewContext } from '@/components/store/PreviewCart'
import type { CatalogDesign, CatalogPhoneModel } from '@/components/store/catalog'
import type { DeviceClass } from '@/utilities/device'
import '@/components/store/store.css'
export function ProductPreview({
  design,
  models,
  device,
}: {
  design: CatalogDesign
  models: CatalogPhoneModel[]
  device: DeviceClass
}) {
  return (
    <PreviewContext.Provider value={true}>
      <StoreUIProvider>
        <div className="store-root">
          <div
            style={{
              padding: 16,
              background: '#e5eccf',
              color: '#293125',
              position: 'relative',
              zIndex: 50,
            }}
          >
            Private product preview · Shopping is disabled.{' '}
            <a href="/catalog-studio">Back to Catalog Studio ↗</a>
          </div>
          <ProductExperience
            initialDesign={design}
            catalog={[design]}
            phoneModels={models}
            device={device}
          />
        </div>
      </StoreUIProvider>
    </PreviewContext.Provider>
  )
}
