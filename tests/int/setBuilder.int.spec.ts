import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BundleBuilder } from '@/components/store/BundleBuilder'
import { StoreUIProvider } from '@/components/store/StoreUI'
import { SetOfferNotice } from '@/components/store/SetOfferNotice'
import { AddCaseForPhone } from '@/components/Cart/AddCaseForPhone'
import { priceCases } from '@/lib/commerce/bundlePricing'
import type { ExperienceProps } from '@/components/store/ProductExperience'

const state = vi.hoisted(() => ({ quantity: 3, addItem: vi.fn(), decrementItem: vi.fn() }))
vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useCart: () => ({
    cart: {
      id: 10,
      subtotal: priceCases([{ quantity: state.quantity, unitPrice: 3900 }]).subtotal,
      items: [
        {
          id: 'line-1',
          quantity: state.quantity,
          product: { id: 1, title: 'Meridian', priceInUSD: 3900 },
          variant: { options: [{ label: 'iPhone' }], priceInUSD: 3900 },
        },
      ],
    },
    isLoading: false,
    addItem: state.addItem,
    decrementItem: state.decrementItem,
  }),
}))

const design: ExperienceProps['design'] = {
  id: 1,
  slug: 'meridian',
  title: 'Meridian',
  tagline: '',
  story: null,
  palette: [],
  price: 3900,
  renders: {
    hero: null,
    flat: null,
    threeQuarter: null,
    turntable: [],
    tumble: [],
    tumblePhases: null,
  },
  modelRenders: {},
  gallery: [],
  collections: [],
  variants: [{ id: 1, optionId: 1, price: 3900 }],
}
const phone: ExperienceProps['phoneModels'][number] = {
  id: 1,
  name: 'iPhone',
  slug: 'iphone',
  brand: 'apple',
  status: 'active',
  optionId: 1,
  sortOrder: 0,
}
const props: ExperienceProps = {
  design,
  catalog: [design],
  phoneModels: [phone],
  selectedModel: phone,
  family: 'iphone',
  selectFamily: vi.fn(),
  selectModel: vi.fn(),
  switchDesign: vi.fn(),
  openCatalog: vi.fn(),
}
const builder = () => createElement(StoreUIProvider, null, createElement(BundleBuilder, props))

afterEach(cleanup)
beforeEach(() => {
  state.quantity = 3
  vi.clearAllMocks()
})

describe('shopping in complete sets', () => {
  it('adds the same design using the newly chosen variant without editing the original line', async () => {
    render(
      createElement(AddCaseForPhone, {
        productId: 1,
        title: 'Meridian',
        options: [
          { variantId: 11, phoneModelId: 1, name: 'iPhone', price: 3900 },
          { variantId: 12, phoneModelId: 2, name: 'Galaxy', price: 3900 },
        ],
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add for another phone' }))
    expect(state.addItem).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '12' } })
    expect(screen.getByText('$89.00')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add this case' }))
    await waitFor(() => expect(state.addItem).toHaveBeenCalledWith({ product: 1, variant: 12 }))
    expect(state.decrementItem).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Added for Galaxy'),
    )
    expect(screen.getByRole('combobox')).toBeTruthy()
  })

  it('opens three empty slots without adding or charging for another case', () => {
    render(builder())
    fireEvent.click(screen.getByRole('button', { name: 'Build another set · $50' }))
    expect(screen.getByText('Set 2 · $50')).toBeTruthy()
    expect(screen.getByText('0 of 3 selected')).toBeTruthy()
    expect(screen.getByText('3 cases · $50.00 subtotal')).toBeTruthy()
    expect(state.addItem).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Back to my completed set' }))
    expect(screen.getByText('Set 1 · $50')).toBeTruthy()
    expect(screen.getByText('Your set is complete')).toBeTruthy()
  })

  it('advances through additional sets and recovers when cases are removed', () => {
    const view = render(builder())
    fireEvent.click(screen.getByRole('button', { name: 'Build another set · $50' }))
    state.quantity = 4
    view.rerender(builder())
    expect(screen.getByText('1 of 3 selected')).toBeTruthy()
    expect(screen.getByText('4 cases in bag · $89.00 current subtotal')).toBeTruthy()
    state.quantity = 6
    view.rerender(builder())
    expect(screen.getByText('2 sets complete · $100.00')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Build another set · $50' }))
    expect(screen.getByText('Set 3 · $50')).toBeTruthy()
    state.quantity = 5
    view.rerender(builder())
    expect(screen.getByText('Set 2 · $50')).toBeTruthy()
    expect(screen.getByText('2 of 3 selected')).toBeTruthy()
    expect(screen.getByText('Complete the set and your subtotal drops by $28.00.')).toBeTruthy()
  })

  it.each([
    [
      1,
      'Choose 2 more · 3 cases for $50.00',
      'Complete the set for $11.00 more than your current subtotal.',
    ],
    [
      2,
      'Choose 1 more · 3 cases for $50.00',
      'Complete the set and your subtotal drops by $28.00.',
    ],
    [
      4,
      'Choose 2 more · 6 cases for $100.00',
      'Complete the set for $11.00 more than your current subtotal.',
    ],
    [
      5,
      'Choose 1 more · 6 cases for $100.00',
      'Complete the set and your subtotal drops by $28.00.',
    ],
    [
      8,
      'Choose 1 more · 9 cases for $150.00',
      'Complete the set and your subtotal drops by $28.00.',
    ],
    [
      9,
      '3 sets complete · $150.00',
      'Keep them, share them, or build another set of three for $50.',
    ],
  ])('shows the actual offer at quantity %i', (quantity, title, detail) => {
    const pricing = priceCases([{ quantity, unitPrice: 3900 }])
    render(createElement(SetOfferNotice, { quantity, subtotal: pricing.subtotal }))
    expect(screen.getByText(title)).toBeTruthy()
    expect(screen.getByText(detail)).toBeTruthy()
  })
})
