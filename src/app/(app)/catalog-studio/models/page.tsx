import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { studioAuth } from '@/lib/studio/auth'
import { listReviews } from '@/lib/model-review/server'
import ReviewDashboard from '@/components/model-review/ReviewDashboard'
export const metadata = { title: 'Case model review', robots: { index: false, follow: false } }
export default async function ModelReview() {
  const auth = await studioAuth(await headers())
  if (!auth) redirect('/admin/login?redirect=%2Fcatalog-studio%2Fmodels')
  return <ReviewDashboard initial={await listReviews(auth.req)} />
}
