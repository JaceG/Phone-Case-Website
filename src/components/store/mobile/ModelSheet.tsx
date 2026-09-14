'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { ExperienceProps } from '../ProductExperience'
import { formatPrice, variantFor } from '../catalog'

type Props = ExperienceProps & { open: boolean; onClose: () => void }

export function ModelSheet({
  design,
  phoneModels,
  selectedModel,
  selectModel,
  open,
  onClose,
}: Props) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 rounded-t-3xl bg-[#e8ebe1] text-[#293125]"
        data-lenis-prevent
      >
        <SheetHeader className="px-6 pt-7">
          <SheetTitle className="text-2xl font-normal text-[#293125]">Your phone</SheetTitle>
          <SheetDescription className="text-xs text-[#616d57]">
            {design.title} · choose the model for your next case
          </SheetDescription>
        </SheetHeader>
        <ul className="overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] divide-y divide-[#bdc6b1]">
          {phoneModels.map((model) => {
            const variant = variantFor(design, model)
            const active = selectedModel?.id === model.id
            return (
              <li key={model.id}>
                <button
                  type="button"
                  disabled={!variant}
                  aria-pressed={active}
                  className="flex w-full items-center justify-between py-4 text-left disabled:opacity-40"
                  onClick={() => {
                    navigator.vibrate?.(8)
                    selectModel(model.id)
                    onClose()
                  }}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`h-4 w-4 rounded-full border border-[#7a886a] ${active ? 'bg-[#53673b]' : ''}`}
                    />
                    <span className="text-base">{model.name}</span>
                  </span>
                  <span className="text-xs">{variant ? formatPrice(variant.price) : 'Soon'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
