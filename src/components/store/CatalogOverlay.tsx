'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, X } from 'lucide-react'
import type { CatalogDesign } from './catalog'
import { formatPrice, thumbImage } from './catalog'

type Props = {
  open: boolean
  onClose: () => void
  catalog: CatalogDesign[]
  activeSlug: string
  onSelect: (slug: string) => void
}

export function CatalogOverlay({ open, onClose, catalog, activeSlug, onSelect }: Props) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[#cdd1ca]/90 backdrop-blur-xl" />
        <Dialog.Content
          className="store-root fixed inset-0 z-[61] overflow-y-auto px-6 pb-14 pt-20 md:px-[7vw]"
          data-lenis-prevent
        >
          <Dialog.Close
            className="fixed right-6 top-5 z-10 flex items-center gap-3 border border-[#89967e] bg-[#e6e9df] px-4 py-3 text-sm"
            aria-label="Close designs"
          >
            Close <X size={18} />
          </Dialog.Close>
          <span className="editorial-kicker">The first collection</span>
          <Dialog.Title className="mt-5 text-4xl font-normal md:text-6xl">
            Find your next favourite.
          </Dialog.Title>
          <Dialog.Description className="mt-5 max-w-lg text-sm leading-relaxed">
            Explore every design. Choose any three for $50, or buy one at its individual price. Your
            phone and bag stay with you as you browse.
          </Dialog.Description>
          <div className="mt-10 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((design) => (
              <button
                type="button"
                key={design.id}
                className="text-left"
                aria-current={activeSlug === design.slug ? 'true' : undefined}
                onClick={() => onSelect(design.slug)}
              >
                <div className="relative h-[350px] border border-[#a6afa0] bg-[#e4e8de]">
                  {thumbImage(design) && (
                    <img
                      className="h-full w-full object-contain p-6"
                      src={thumbImage(design)!}
                      alt={`${design.title} case`}
                      loading="lazy"
                    />
                  )}
                  <span className="absolute bottom-3 left-4 text-xs">
                    {design.collections[0]?.title}
                  </span>
                  <ArrowRight className="absolute bottom-3 right-4" size={20} />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <h3 className="text-xl">{design.title}</h3>
                  <span className="text-xs">{formatPrice(design.price)} individually</span>
                </div>
                <p className="mt-1 text-sm text-[#58634e]">{design.tagline}</p>
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
