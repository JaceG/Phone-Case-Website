import type { Metadata } from 'next'
import { CheckoutPage } from '@/components/checkout/CheckoutPage'

export default function Checkout() {
  return (
    <div className="min-h-screen bg-[#f2f1eb] pb-14 pt-24">
      <CheckoutPage />
    </div>
  )
}
export const metadata: Metadata = {
  title: 'Your selection',
  description: 'Review your designs, phone models, and three-case offer.',
}
