import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { studioAuth } from '@/lib/studio/auth'
import { geometryVersion } from '@/lib/studio/save'

export const metadata = { title: 'Case model review', robots: { index: false, follow: false } }
const labels = {
  draft: 'Draft model',
  review: 'Ready for your review',
  changes: 'Changes requested',
  approved: 'Preview approved',
  rejected: 'Rejected',
}

export default async function ModelReview() {
  const auth = await studioAuth(await headers())
  if (!auth) redirect('/admin/login?redirect=%2Fcatalog-studio%2Fmodels')
  const current = await geometryVersion()
  const models = await auth.payload.find({
    collection: 'caseBlanks',
    req: auth.req,
    overrideAccess: false,
    depth: 1,
    pagination: false,
    sort: '-createdAt',
  })
  return (
    <main
      style={{
        maxWidth: 1300,
        margin: '0 auto',
        padding: '50px 24px',
        color: '#232522',
        background: '#f8f8f3',
        minHeight: '100vh',
      }}
    >
      <Link href="/catalog-studio">← Catalog Studio</Link>
      <h1 style={{ fontSize: 40, marginTop: 24 }}>Case model review</h1>
      <p>
        Review one model at a time. Compare the camera surround, openings, edges and artwork
        placement before approving its preview.
      </p>
      {!models.docs.length && (
        <p>
          No model review packages yet.{' '}
          <Link href="/admin/collections/caseBlanks">Open the model library</Link>.
        </p>
      )}
      {models.docs.map((model) => (
        <article
          key={model.id}
          style={{ marginTop: 40, borderTop: '1px solid #ddded7', paddingTop: 24 }}
        >
          <h2 style={{ fontSize: 26 }}>{model.title}</h2>
          <p>
            <strong>{labels[model.previewStatus]}</strong> ·{' '}
            {model.sampleStatus === 'validated'
              ? 'Physical sample validated'
              : 'Physical sample validation pending'}
          </p>
          {model.geometryVersion !== current && (
            <p>
              This geometry differs from the version currently loaded in Studio. Review it separately
              before using it.
            </p>
          )}
          {model.supplierURL && (
            <p>
              <a href={model.supplierURL} target="_blank" rel="noreferrer">
                Open supplier reference ↗
              </a>{' '}
              · {model.supplierVariant}
            </p>
          )}
          <p style={{ maxWidth: 950, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {model.reviewNotes}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: 20,
              margin: '24px 0',
            }}
          >
            {model.reviewImages?.map((entry, i) => {
              const file = typeof entry.image === 'object' ? entry.image.filename : null
              if (!file) return null
              const url = `/api/productionAssets/file/${encodeURIComponent(file)}`
              return (
                <figure
                  key={entry.id ?? i}
                  style={{
                    margin: 0,
                    padding: 16,
                    border: '1px solid #ddded7',
                    background: '#e5e5e1',
                  }}
                >
                  <a href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt={entry.caption}
                      style={{ width: '100%', height: 340, objectFit: 'contain' }}
                    />
                  </a>
                  <figcaption style={{ marginTop: 12, fontSize: 14 }}>{entry.caption}</figcaption>
                </figure>
              )
            })}
          </div>
          <a
            href={`/admin/collections/caseBlanks/${model.id}`}
            style={{
              display: 'inline-block',
              padding: '14px 22px',
              background: '#d7ee8a',
              color: '#232522',
              textDecoration: 'none',
              borderRadius: 4,
            }}
          >
            Record review decision and notes ↗
          </a>
          <p style={{ fontSize: 13, marginTop: 12 }}>
            Choose Preview approved, Changes requested or Rejected in the model record. This does
            not enable sales or mark a physical sample validated.
          </p>
        </article>
      ))}
    </main>
  )
}
