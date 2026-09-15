import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import CaseStudio from '@/components/case-studio/CaseStudio'
import { studioAuth } from '@/lib/studio/auth'

export const metadata = { title: 'Catalog Studio', robots: { index: false, follow: false } }

export default async function CatalogStudio() {
  if (!(await studioAuth(await headers()))) redirect('/admin/login?redirect=%2Fcatalog-studio')
  return <CaseStudio catalog />
}
