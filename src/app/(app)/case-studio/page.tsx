import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CaseStudio from '@/components/case-studio/CaseStudio'

export const metadata: Metadata = {
  title: 'Case Studio — local artwork editor',
  robots: { index: false, follow: false },
}

export default function CaseStudioPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <CaseStudio />
}
