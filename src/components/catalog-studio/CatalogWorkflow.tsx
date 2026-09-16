'use client'
import { useEffect, useState } from 'react'
import type { StudioDocument } from '@/lib/studio/contract'
import { imageURL } from '@/lib/studio-publish/urls'
import type { RenderJob, StudioPhone } from '@/lib/studio-publish/types'
import type { ModelSettings } from '@/lib/studio/modelSettings'
import './workflow.css'
export function CatalogWorkflow({
  draft,
  dirty,
  saving,
  models,
  settings,
  onSettings,
  onEditPhone,
}: {
  draft: StudioDocument | null
  dirty: boolean
  saving: boolean
  models: StudioPhone[]
  settings: ModelSettings
  onSettings: (settings: ModelSettings) => void
  onEditPhone: (id?: number) => void
}) {
  const selected = settings.phones
  const [job, setJob] = useState<RenderJob | null>(null)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [published, setPublished] = useState('')
  useEffect(() => {
    let cancelled = false
    setJob(null)
    setPublished('')
    setError('')
    fetch(`/api/catalog-studio/render${draft ? `?revision=${draft.id}` : ''}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw Error(data.error)
        if (cancelled) return
        if (data.job) {
          setJob(data.job)
          setPublished(data.job.publishedURL ?? '')
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [draft?.id])
  useEffect(() => {
    if (!job || !['queued', 'rendering'].includes(job.status)) return
    let cancelled = false
    const timer = setInterval(() => {
      fetch(`/api/catalog-studio/render?job=${job.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && !data.error) setJob(data)
        })
        .catch(() => {})
    }, 2500)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [job?.id, job?.status])
  const running = Boolean(job && ['queued', 'rendering'].includes(job.status))
  async function action(publish = false) {
    if (!draft) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/catalog-studio/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          publish
            ? { action: 'publish', job: job!.id }
            : {
                revision: draft.id,
                phones: selected,
                placements: Object.fromEntries(
                  Object.entries(settings.placements).map(([id, fit]) => [id, fit.placement]),
                ),
              },
        ),
      })
      const data = await response.json()
      if (!response.ok) throw Error(data.error)
      if (publish) {
        setPublished(data.url)
        setJob((j) => (j ? { ...j, status: 'published', publishedURL: data.url } : j))
      } else {
        setJob(data)
        setPublished('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }
  const ready =
    job && job.revision === draft?.id && ['ready', 'published'].includes(job.status) && !dirty
  return (
    <section className="cw-workflow" aria-label="Prepare and publish design">
      <div>
        <span className="cw-kicker">Your design, ready for the store</span>
        <h2>From artwork to product page.</h2>
        <p>
          Choose phones, check placement, then generate and review your previews before publishing.
        </p>
      </div>
      {!draft && (
        <p className="cw-notice">
          Fill in Design details and save your first draft above to begin.
        </p>
      )}
      {dirty && (
        <p className="cw-notice">
          Save your latest artwork and design details before generating or publishing.
        </p>
      )}
      <fieldset disabled={running || busy || saving}>
        <legend>1 / Supported phones · {selected.length} selected</legend>
        <div className="cw-actions">
          {[
            ['All approved models', 'all'],
            ['iPhones', 'apple'],
            ['Samsung', 'samsung'],
            ['Clear selection', 'none'],
          ].map(([label, brand]) => (
            <button
              type="button"
              key={brand}
              onClick={() => {
                onSettings({
                  ...settings,
                  phones: models
                    .filter((m) => brand === 'all' || m.brand === brand)
                    .map((m) => m.id),
                })
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="cw-phones">
          {models.map((phone) => (
            <label key={phone.id}>
              <input
                type="checkbox"
                checked={selected.includes(phone.id)}
                onChange={(e) => {
                  onSettings({
                    ...settings,
                    phones: e.target.checked
                      ? [...selected, phone.id]
                      : selected.filter((id) => id !== phone.id),
                  })
                }}
              />
              {phone.name}
            </label>
          ))}
        </div>
        <button type="button" className="cw-button" onClick={() => onEditPhone()}>
          Edit phone fits ↑
        </button>
      </fieldset>
      <div className="cw-step">
        <h3>2 / Generate previews</h3>
        <p>
          Each phone uses its saved custom fit, or the shared placement if you haven’t adjusted it.
          Originals and print layouts stay private.
        </p>
        <button
          className="cs-primary"
          disabled={!draft || dirty || running || busy || saving || !selected.length}
          onClick={() => void action()}
        >
          {running ? 'Generating…' : job ? 'Regenerate previews' : 'Generate previews'}
        </button>
        {job && (
          <div role="status">
            <p>
              {running
                ? `${job.completed} of ${job.models.length} phones ready`
                : job.status === 'failed'
                  ? job.error
                  : dirty
                    ? 'Placement or phone selection changed. Generate fresh previews.'
                    : `${job.models.length} phone previews ready`}
            </p>
            {running && <progress value={job.completed} max={job.models.length} />}
          </div>
        )}
      </div>
      {job && job.completed > 0 && (
        <div className="cw-gallery">
          {job.models.slice(0, job.completed).map((m) => (
            <figure key={m.id}>
              <img
                src={imageURL(job.id, m.slug, 'hero')}
                alt={`${job.title} on ${m.name}`}
                loading="lazy"
              />
              <figcaption>{m.name}</figcaption>
              <button disabled={running || busy || saving} onClick={() => onEditPhone(m.id)}>
                Adjust placement
              </button>
              <a href={imageURL(job.id, m.slug, 'print')} target="_blank" rel="noreferrer">
                Print layout ↗
              </a>
            </figure>
          ))}
        </div>
      )}
      <div className="cw-step">
        <h3>3 / Review and publish</h3>
        <p>
          Preview the complete landing page. Publishing adds this design to the store and set
          builder.
        </p>
        <div className="cw-actions">
          {ready && (
            <>
              <a
                className="cw-button"
                target="_blank"
                href={`/catalog-studio/preview/${job.id}`}
                rel="noreferrer"
              >
                Preview product page ↗
              </a>
              <a
                className="cw-button"
                target="_blank"
                href={`/catalog-studio/preview/${job.id}?device=mobile`}
                rel="noreferrer"
              >
                Preview mobile ↗
              </a>
            </>
          )}
          <button
            className="cs-primary"
            disabled={!ready || busy || saving || job?.status === 'published'}
            onClick={() => void action(true)}
          >
            {busy ? 'Working…' : job?.status === 'published' ? 'Published' : 'Publish to catalog'}
          </button>
        </div>
        {published && (
          <p>
            <a href={published} target="_blank" rel="noreferrer">
              Open published product page ↗
            </a>
          </p>
        )}
      </div>
      {error && (
        <p className="cw-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
