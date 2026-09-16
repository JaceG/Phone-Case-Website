'use client'

import { useState } from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { ExperienceProps } from '../ProductExperience'
import { formatPrice, variantFor, groupPhoneModels } from '../catalog'

type Props = ExperienceProps & { open: boolean; onClose: () => void }

export function ModelSheet({
  design,
  phoneModels,
  selectedModel,
  selectModel,
  open,
  onClose,
}: Props) {
  const [search, setSearch] = useState('')
  const groups = groupPhoneModels(
    phoneModels.filter((m) => m.name.toLowerCase().includes(search.toLowerCase().trim())),
  )
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
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Find your phone"
          placeholder="Find your phone…"
          className="mx-6 my-4 rounded border border-[#bdc6b1] bg-white/60 px-3 py-3"
        />
        <ul className="overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] divide-y divide-[#bdc6b1]">
          {groups.map(([group, models]) => (
            <li key={group}>
              <h3 className="sticky top-0 bg-[#e8ebe1] py-2 text-sm font-medium">{group}</h3>
              <ul>
                {models.map((model) => {
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
                        <span className="text-xs">
                          {variant ? formatPrice(variant.price) : 'Soon'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
          {!groups.length && <li className="py-4 text-sm">No matching phone models.</li>}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
