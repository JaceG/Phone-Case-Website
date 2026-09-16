import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { story } from '@/lib/studio/save'
import { studioAuth } from '@/lib/studio/auth'
import { readJob } from '@/lib/studio-publish/jobs'
import { privatePresentation } from '@/lib/studio-publish/server'
import { toCatalogDesign, toCatalogPhoneModel } from '@/components/store/catalog'
import { ProductPreview } from '@/components/catalog-studio/ProductPreview'
import { getDeviceClass } from '@/utilities/device'
export const metadata = {
  title: 'Private product preview',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ device?: string }>
}) {
  const auth = await studioAuth(await headers())
  const { id } = await params
  if (!auth)
    redirect(`/admin/login?redirect=${encodeURIComponent(`/catalog-studio/preview/${id}`)}`)
  const job = await readJob(id).catch(() => null)
  if (!job || !['ready', 'published'].includes(job.status)) notFound()
  const product = await auth.payload.findByID({
    collection: 'products',
    id: job.product,
    draft: true,
    depth: 1,
    req: auth.req,
  })
  const saved = await auth.payload.findByID({
    collection: 'studioRevisions',
    id: job.revision,
    req: auth.req,
    depth: 0,
  })
  const details = saved.details as {
    title: string
    slug: string
    tagline: string
    price: number
    description: string
  }
  const design = toCatalogDesign({
    ...product,
    title: details.title,
    slug: details.slug,
    tagline: details.tagline,
    description: story(details.description),
    priceInUSD: Math.round(details.price * 100),
    studioPresentation: privatePresentation(job) as never,
  })
  const phones = await auth.payload.find({
    collection: 'phoneModels',
    pagination: false,
    depth: 0,
    req: auth.req,
    where: { id: { in: job.models.map((m) => m.id) } },
  })
  const models = phones.docs.map((p) => ({
    ...toCatalogPhoneModel(p),
    previewVersion: job.models.find((m) => m.id === p.id)!.version,
  }))
  design.variants = models.map((m) => ({ id: -m.id, optionId: m.optionId!, price: design.price }))
  const { device } = await searchParams
  return <ProductPreview design={design} models={models} device={await getDeviceClass(device)} />
}
