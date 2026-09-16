import type { UIFieldServerProps } from 'payload'
import { latestJob } from '@/lib/studio-publish/jobs'

export async function DesignGuide({ data, req }: UIFieldServerProps) {
  const revision = data?.id
    ? (
        await req.payload.find({
          collection: 'studioRevisions',
          req,
          depth: 0,
          where: { product: { equals: data.id } },
          sort: '-revision',
          limit: 1,
        })
      ).docs[0]
    : null
  const job = revision ? await latestJob(revision.id) : null
  return (
    <section
      style={{
        padding: '20px 24px',
        marginBottom: 24,
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 6,
        background: 'var(--theme-elevation-50)',
      }}
    >
      <h3 style={{ margin: '0 0 8px' }}>Your design, with the setup handled.</h3>
      <p style={{ margin: '0 0 12px', maxWidth: 750 }}>
        Copy, artwork colors, search details and related designs fill automatically when you save.
        Edit any suggestion to keep your own version. Price starts at $39; artwork permissions stay
        yours to confirm.
      </p>
      <p style={{ margin: '0 0 12px' }}>
        {job
          ? job.status === 'published'
            ? 'This design has a published preview set.'
            : job.status === 'ready'
              ? `${job.models.length} phone previews are ready to review in Studio.`
              : job.status === 'failed'
                ? 'Previews need another attempt. Open Studio to retry.'
                : `Generating previews: ${job.completed} of ${job.models.length} phones ready.`
          : 'Use Studio to choose phones and generate images. The sharing image and phone variants are filled when you publish there.'}
      </p>
      <a
        href={revision ? `/catalog-studio?revision=${revision.id}` : '/catalog-studio'}
        style={{ fontWeight: 600 }}
      >
        {' '}
        {revision
          ? 'Continue this design in Catalog Studio ↗'
          : 'Create artwork in Catalog Studio ↗'}
      </a>
      <small style={{ display: 'block', marginTop: 8 }}>
        Save admin changes as a draft before opening Studio. Its publish step checks your generated
        previews.
      </small>
    </section>
  )
}
