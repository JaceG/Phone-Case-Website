'use client'

import { useEffect, useId, useState } from 'react'
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { Plus, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import type { CasePhoneOption } from '@/lib/commerce/groupCartDesigns'
import { cartPricing } from '@/lib/commerce/bundlePricing'
import { formatPrice } from '@/components/store/catalog'
import './cart.css'

export function AddCaseForPhone({
  productId,
  title,
  options: suppliedOptions,
}: {
  productId: number
  title: string
  options?: CasePhoneOption[]
}) {
  const { cart, addItem, isLoading } = useCart()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<CasePhoneOption[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [addedModel, setAddedModel] = useState('')
  const id = useId()

  useEffect(() => {
    if (!open || suppliedOptions) return
    const controller = new AbortController()
    setLoading(true)
    setOptions([])
    setError('')
    fetch(`/api/case-model-options?product=${productId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load phones')
        const data = (await response.json()) as { options: CasePhoneOption[] }
        if (!controller.signal.aborted) setOptions(data.options)
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Could not load phone models. Close and try again.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [open, productId, suppliedOptions])

  const choices = suppliedOptions ?? options
  const choice = choices.find((option) => String(option.variantId) === selected)
  const projected = choice
    ? cartPricing([
        ...(cart?.items ?? []),
        {
          quantity: 1,
          product: { priceInUSD: choice.price },
          variant: { priceInUSD: choice.price },
        },
      ])
    : null
  const busy = loading || adding || isLoading

  return (
    <div className="another-phone">
      <button
        type="button"
        className="another-phone-toggle"
        aria-expanded={open}
        aria-controls={id}
        disabled={adding}
        onClick={() => {
          setOpen(!open)
          setSelected('')
          setError('')
          setAddedModel('')
        }}
      >
        <Smartphone size={14} /> {open ? 'Close phone choices' : 'Add for another phone'}
      </button>
      {open && (
        <div id={id} className="another-phone-panel">
          <label htmlFor={`${id}-model`}>Add {title} for another phone</label>
          <select
            id={`${id}-model`}
            value={selected}
            disabled={busy}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">{loading ? 'Loading phones…' : 'Choose a phone model'}</option>
            {choices.map((option) => (
              <option value={option.variantId} key={option.variantId}>
                {option.name}
              </option>
            ))}
          </select>
          {addedModel && (
            <p role="status">
              Added for {addedModel}. Choose another phone or close when you’re done.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && !choices.length && (
            <p>No phone models are available for this design yet.</p>
          )}
          {projected && (
            <p>
              Bag after adding: {projected.quantity} cases ·{' '}
              <strong>{formatPrice(projected.subtotal)}</strong>
            </p>
          )}
          <button
            type="button"
            className="another-phone-add"
            disabled={!choice || busy}
            onClick={async () => {
              if (!choice || busy) return
              setAdding(true)
              setError('')
              try {
                await addItem({ product: productId, variant: choice.variantId })
                toast.success(`${title} for ${choice.name} added`)
                setAddedModel(choice.name)
                setSelected('')
              } catch {
                setError('Could not add this case. Please try again.')
              } finally {
                setAdding(false)
              }
            }}
          >
            <Plus size={14} /> {adding ? 'Adding…' : 'Add this case'}
          </button>
          <p>
            Same design, another case. Your existing phone choices stay the same. Every complete set
            of three is $50.
          </p>
        </div>
      )}
    </div>
  )
}
