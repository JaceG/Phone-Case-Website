import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { studioAuth } from '@/lib/studio/auth'
import { idOf } from '@/lib/studio/save'
import { getProductThumbnail } from '@/utilities/productImages'
import { DesignLibrary, type DesignCard } from '@/components/workspace/DesignLibrary'
export const metadata = { title: 'My designs', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'
export default async function Page() {
  const auth = await studioAuth(await headers())
  if (!auth) redirect('/admin/login?redirect=%2Fcatalog-studio%2Fdesigns')
  const { payload, req } = auth
  const [products, revisions, live] = await Promise.all([
    payload.find({
      collection: 'products',
      req,
      draft: true,
      depth: 1,
      pagination: false,
      sort: '-updatedAt',
    }),
    payload.find({
      collection: 'studioRevisions',
      req,
      depth: 1,
      pagination: false,
      sort: '-revision',
    }),
    payload.find({
      collection: 'products',
      req,
      draft: false,
      depth: 0,
      pagination: false,
      where: { _status: { equals: 'published' } },
    }),
  ])
  const designs: DesignCard[] = products.docs.map((product) => {
    const saved = revisions.docs.find((revision) => idOf(revision.product) === product.id)
    const preview = saved?.preview
    const published = live.docs.find((item) => item.id === product.id)
    const media = getProductThumbnail(product)
    const image =
      preview && typeof preview === 'object' && preview.filename
        ? `/api/productionAssets/file/${encodeURIComponent(preview.filename)}`
        : media?.filename
          ? `/api/media/file/${encodeURIComponent(media.filename)}`
          : null
    return {
      id: product.id,
      title: product.title,
      image,
      edit: saved
        ? `/catalog-studio?product=${product.id}`
        : `/admin/collections/products/${product.id}`,
      live: published?.slug ? `/products/${published.slug}` : null,
      status: published
        ? product._status === 'draft'
          ? 'Live · draft changes saved'
          : 'Live in store'
        : 'Draft · not in store',
      updated: product.updatedAt,
    }
  })
  return <DesignLibrary designs={designs} />
}
