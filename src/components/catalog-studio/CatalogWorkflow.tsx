'use client'
import { useEffect, useState } from 'react'
import type { Placement } from '@/components/case-studio/artwork'
import type { StudioDocument } from '@/lib/studio/contract'
import { adaptPlacement } from '@/lib/studio-publish/placement'
import { imageURL } from '@/lib/studio-publish/urls'
import type { RenderJob, StudioPhone } from '@/lib/studio-publish/types'
import { ModelPlacement } from './ModelPlacement'
import './workflow.css'
export function CatalogWorkflow({
  draft,
  dirty,
  source,
  aspect,
}: {
  draft: StudioDocument | null
  dirty: boolean
  source: string
  aspect: number
}) {
  const [models, setModels] = useState<StudioPhone[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [placements, setPlacements] = useState<Record<string, Placement>>({})
  const [edit, setEdit] = useState<number | null>(null),
    [job, setJob] = useState<RenderJob | null>(null),
    [changed, setChanged] = useState(false)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [published, setPublished] = useState('')
  useEffect(() => {
    let cancelled = false
    setJob(null)
    setChanged(false)
    setPublished('')
    setError('')
    setPlacements({})
    fetch(`/api/catalog-studio/render${draft ? `?revision=${draft.id}` : ''}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw Error(data.error)
        if (cancelled) return
        setModels(data.models)
        setSelected(
          data.job
            ? data.job.models.map((m: StudioPhone) => m.id)
            : data.models.map((m: StudioPhone) => m.id),
        )
        setEdit(null)
        if (data.job) {
          setJob(data.job)
          setPlacements(
            Object.fromEntries(
              data.job.models.map((m: RenderJob['models'][0]) => [String(m.id), m.placement]),
            ),
          )
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
  useEffect(() => {
    if (!changed) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [changed])
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
            : { revision: draft.id, phones: selected, placements },
        ),
      })
      const data = await response.json()
      if (!response.ok) throw Error(data.error)
      if (publish) {
        setPublished(data.url)
        setJob((j) => (j ? { ...j, status: 'published', publishedURL: data.url } : j))
      } else {
        setJob(data)
        setChanged(false)
        setPublished('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }
  const ready = job && ['ready', 'published'].includes(job.status) && !changed && !dirty
  const editing = models.find((m) => m.id === edit)
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
      <fieldset disabled={!draft || dirty || running || busy}>
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
                setSelected(
                  models.filter((m) => brand === 'all' || m.brand === brand).map((m) => m.id),
                )
                setChanged(true)
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
                  setSelected((ids) =>
                    e.target.checked ? [...ids, phone.id] : ids.filter((id) => id !== phone.id),
                  )
                  setChanged(true)
                }}
              />
              {phone.name}
            </label>
          ))}
        </div>
        <label className="cw-edit-label">
          Check a phone’s placement
          <select
            value={edit ?? ''}
            onChange={(e) => setEdit(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Choose a model to inspect or adjust…</option>
            {models
              .filter((m) => selected.includes(m.id))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {placements[String(m.id)] ? ' · adjusted' : ''}
                </option>
              ))}
          </select>
        </label>
        {draft && editing && (
          <ModelPlacement
            phone={editing}
            source={source}
            aspect={aspect}
            placement={
              placements[String(editing.id)] ?? adaptPlacement(draft.placement, editing.params)
            }
            onChange={(p) => {
              setPlacements((old) => ({ ...old, [String(editing.id)]: p }))
              setChanged(true)
            }}
            onReset={() => {
              setPlacements((old) => {
                const next = { ...old }
                delete next[String(editing.id)]
                return next
              })
              setChanged(true)
            }}
          />
        )}
      </fieldset>
      <div className="cw-step">
        <h3>2 / Generate previews</h3>
        <p>
          Your saved placement is applied to every selected phone. Originals and print layouts stay
          private.
        </p>
        <button
          className="cs-primary"
          disabled={!draft || dirty || running || busy || !selected.length}
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
                  : changed
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
              <button disabled={running || dirty || busy} onClick={() => setEdit(m.id)}>
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
            disabled={!ready || busy || job?.status === 'published'}
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
