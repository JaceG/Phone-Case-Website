'use client'
import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  canReview,
  filterModels,
  stageLabels,
  statusLabels,
  type PhoneChoice,
  type ReviewModel,
} from '@/lib/model-review/shared'
import './review.css'

function Modal({
  title,
  close,
  children,
}: {
  title: string
  close: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
    return () => ref.current?.close()
  }, [])
  return (
    <dialog
      className="mr-dialog"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      aria-label={title}
    >
      <header className="mr-dialog-head">
        <h2>{title}</h2>
        <button onClick={close} aria-label="Close dialog">
          Close ×
        </button>
      </header>
      {children}
    </dialog>
  )
}
function Badge({ model }: { model: ReviewModel }) {
  return (
    <span className={`mr-badge mr-${model.status}`}>
      {model.status === 'draft' ? stageLabels[model.stage] : statusLabels[model.status]}
    </span>
  )
}
function Gallery({ model, compact = false }: { model: ReviewModel; compact?: boolean }) {
  const [index, setIndex] = useState(0)
  const image = model.images[index] ?? model.images[0]
  return (
    <div className={`mr-gallery ${compact ? 'mr-compact' : ''}`}>
      {image ? (
        <>
          <a href={image.url} target="_blank" rel="noreferrer">
            <img className="mr-main-image" src={image.url} alt={image.caption} />
          </a>
          <p>
            {image.caption} <small> · Click image for full size</small>
          </p>
          <div className="mr-thumbnails">
            {model.images.map((img, i) => (
              <button
                key={img.url}
                aria-label={`View ${img.caption}`}
                aria-pressed={index === i}
                onClick={() => setIndex(i)}
              >
                <img src={img.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mr-no-image">Preview not built yet</div>
      )}
    </div>
  )
}
export default function ReviewDashboard({
  initial,
}: {
  initial: { models: ReviewModel[]; phones: PhoneChoice[] }
}) {
  const [models, setModels] = useState(initial.models)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [brand, setBrand] = useState('all')
  const [batch, setBatch] = useState('all')
  const [sort, setSort] = useState('priority')
  const [selected, setSelected] = useState<number[]>([])
  const [active, setActive] = useState<ReviewModel | null>(null)
  const [compare, setCompare] = useState(false)
  const [queue, setQueue] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [phoneIds, setPhoneIds] = useState<number[]>([])
  const [batchName, setBatchName] = useState('')
  const [priority, setPriority] = useState('normal')
  const [conflict, setConflict] = useState(false)
  const batches = [...new Set(models.map((m) => m.batch))].sort()
  const visible = filterModels(models, query, status, brand, batch).sort((a, b) =>
    sort === 'name'
      ? a.phone.localeCompare(b.phone)
      : sort === 'updated'
        ? b.updatedAt.localeCompare(a.updatedAt)
        : Number(b.priority === 'high') - Number(a.priority === 'high') ||
          Number(b.status === 'review') - Number(a.status === 'review') ||
          a.phone.localeCompare(b.phone),
  )
  useEffect(() => {
    const id = Number(new URL(location.href).searchParams.get('model'))
    const model = initial.models.find((m) => m.id === id)
    if (model) {
      setActive(model)
      setFeedback(model.feedback)
    }
  }, [initial.models])
  function open(model: ReviewModel) {
    setActive(model)
    setFeedback(model.feedback)
    setError('')
    setConflict(false)
    const url = new URL(location.href)
    url.searchParams.set('model', String(model.id))
    history.replaceState(null, '', url)
  }
  function closeReview() {
    if (busy) return
    if (active && feedback !== active.feedback && !confirm('Discard unsaved feedback?')) return
    setActive(null)
    setError('')
    setConflict(false)
    const url = new URL(location.href)
    url.searchParams.delete('model')
    history.replaceState(null, '', url)
  }
  async function refresh() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/model-review', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModels(data.models)
      return data.models as ReviewModel[]
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not refresh.')
      return null
    } finally {
      setBusy(false)
    }
  }
  async function post(data: unknown) {
    const res = await fetch('/api/model-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) {
      if (res.status === 409) setConflict(true)
      throw new Error(result.error)
    }
    return result
  }
  async function decide(next: string) {
    if (!active || busy) return
    setBusy(true)
    setError('')
    try {
      const saved: ReviewModel = await post({
        action: 'decision',
        id: active.id,
        updatedAt: active.updatedAt,
        version: active.version,
        status: next,
        feedback,
      })
      setModels((ms) => ms.map((m) => (m.id === saved.id ? saved : m)))
      setActive(saved)
      setFeedback(saved.feedback)
      setMessage(
        `${saved.phone}: ${next === 'note' ? 'feedback saved' : statusLabels[saved.status]}.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }
  async function createQueue() {
    setBusy(true)
    setError('')
    try {
      const result = await post({ action: 'queue', phoneIds, batch: batchName, priority })
      await refresh()
      setQueue(false)
      setPhoneIds([])
      setMessage(
        `${result.created.length} models added to “${batchName}”. ${result.existing.length ? `${result.existing.length} already queued.` : 'Ready for preparation in any order.'}`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not queue models.')
    } finally {
      setBusy(false)
    }
  }
  function exportWorklist() {
    const items = models.filter((m) => selected.includes(m.id))
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            models: items.map((m) => ({
              id: m.id,
              phone: m.phone,
              slug: m.slug,
              batch: m.batch,
              stage: m.stage,
              status: m.status,
              version: m.version,
              updatedAt: m.updatedAt,
              feedback: m.feedback,
              references: m.references,
              supplierURL: m.supplierURL,
              notes: m.notes,
            })),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'case-model-worklist.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  const compared = models.filter((m) => selected.includes(m.id))
  return (
    <main className="mr-page">
      <nav>
        <Link href="/catalog-studio">← Catalog Studio</Link>
        <Link href="/admin/collections/caseBlanks">Model library ↗</Link>
      </nav>
      <header className="mr-heading">
        <div>
          <span className="mr-eyebrow">MODEL LIBRARY / REVIEW DESK</span>
          <h1>Case model review</h1>
          <p>I prepare the models. You review the results, in any order.</p>
        </div>
        <div className="mr-actions">
          <button onClick={() => void refresh()} disabled={busy}>
            Refresh
          </button>
          <details className="mr-preparation-tools">
            <summary>Preparation tools</summary>
            <p className="mr-hint">For preparing models. You can review without using these.</p>
            <button
              onClick={() => {
                setQueue(true)
                setError('')
              }}
            >
              Add preparation group
            </button>
            <button onClick={exportWorklist} disabled={!selected.length}>
              Export selected worklist
            </button>
          </details>
        </div>
      </header>
      <div className="mr-stats">
        {(
          [
            ['all', 'All models', models.length],
            ['review', 'Ready for you', models.filter((m) => m.status === 'review').length],
            ['draft', 'In preparation', models.filter((m) => m.status === 'draft').length],
            [
              'attention',
              'Needs attention',
              models.filter((m) => m.status === 'changes' || m.stage === 'failed').length,
            ],
            ['approved', 'Approved previews', models.filter((m) => m.status === 'approved').length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            className={status === value ? 'mr-stat-active' : ''}
            onClick={() => setStatus(value)}
          >
            <strong>{count}</strong>
            <span>{label}</span>
          </button>
        ))}
      </div>
      {message && (
        <p className="mr-message" role="status">
          {message}
        </p>
      )}
      {error && !active && !queue && (
        <p className="mr-error" role="alert">
          {error}
        </p>
      )}
      <section className="mr-filters" aria-label="Filter models">
        <label className="mr-search">
          Search
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a phone or case…"
          />
        </label>
        <label>
          Status
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
            <option value="attention">Needs attention</option>
          </select>
        </label>
        <label>
          Brand
          <select aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="all">All brands</option>
            <option value="apple">Apple</option>
            <option value="samsung">Samsung</option>
            <option value="google">Google</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Group
          <select
            aria-label="Preparation group"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
          >
            <option value="all">All preparation groups</option>
            {batches.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="priority">Priority & ready first</option>
            <option value="name">Phone name</option>
            <option value="updated">Recently updated</option>
          </select>
        </label>
      </section>
      <div className="mr-selection">
        <span>
          {visible.length} {visible.length === 1 ? 'model' : 'models'} shown · {selected.length}{' '}
          selected
        </span>
        <div className="mr-actions">
          <button
            onClick={() => setSelected([...new Set([...selected, ...visible.map((m) => m.id)])])}
            disabled={!visible.length}
          >
            Select shown
          </button>
          <button onClick={() => setSelected([])} disabled={!selected.length}>
            Clear
          </button>
          <button
            className="mr-primary"
            onClick={() => setCompare(true)}
            disabled={selected.length < 2 || selected.length > 3}
          >
            Compare {selected.length > 1 ? `(${selected.length})` : ''}
          </button>
        </div>
      </div>
      {selected.length > 3 && (
        <p className="mr-hint">Select two or three models to compare side by side.</p>
      )}
      <section className="mr-grid" aria-label="Case models">
        {visible.map((m) => (
          <article className="mr-card" key={m.id}>
            <div className="mr-card-top">
              <Badge model={m} />
              <label className="mr-check">
                <input
                  type="checkbox"
                  aria-label={`Select ${m.phone}`}
                  checked={selected.includes(m.id)}
                  onChange={(e) =>
                    setSelected((ids) =>
                      e.target.checked ? [...ids, m.id] : ids.filter((id) => id !== m.id),
                    )
                  }
                />
              </label>
            </div>
            <button
              className="mr-card-image"
              onClick={() => open(m)}
              aria-label={`Review ${m.phone}`}
            >
              {m.images.length ? (
                <img
                  src={(m.images.find((i) => /neutral/i.test(i.caption)) ?? m.images[0]).url}
                  alt={`${m.phone} case preview`}
                  loading="lazy"
                />
              ) : (
                <span>
                  <b>
                    {m.brand === 'apple'
                      ? 'iPhone'
                      : m.brand === 'samsung'
                        ? 'Galaxy'
                        : m.brand === 'google'
                          ? 'Pixel'
                          : 'Case'}
                  </b>
                  <small>{stageLabels[m.stage]} · No preview yet</small>
                </span>
              )}
            </button>
            <div className="mr-card-body">
              <div className="mr-card-meta">
                {m.batch}
                {m.priority === 'high' && <b>High priority</b>}
              </div>
              <h2>{m.phone}</h2>
              <p>{m.title}</p>
              {m.feedback && <p className="mr-feedback-excerpt">“{m.feedback}”</p>}
              {m.error && <p className="mr-error">{m.error}</p>}
              <footer>
                <span>
                  {m.images.length} views ·{' '}
                  {m.sample === 'validated' ? 'Sample validated' : 'Sample pending'}
                </span>
                <button onClick={() => open(m)}>
                  {m.images.length ? 'Open review ↗' : 'Open preparation ↗'}
                </button>
              </footer>
            </div>
          </article>
        ))}
      </section>
      {!visible.length && (
        <div className="mr-empty">
          <h2>
            {models.length ? 'No models match these filters' : 'Your models will appear here'}
          </h2>
          <p>
            {models.length
              ? 'Try another status, brand, or search.'
              : 'I will research, build and check each model before bringing it here for review.'}
          </p>
          <button
            onClick={() => {
              setQuery('')
              setStatus('all')
              setBrand('all')
              setBatch('all')
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <p className="mr-hint">
        Open any model to review its views and leave feedback. You can skip around freely; reviewing
        one model never holds up preparation of another. Preview approval is separate from physical
        sample validation and sales availability.
      </p>
      {active && (
        <Modal title={active.phone} close={closeReview}>
          <div className="mr-detail-top">
            <Badge model={active} />
            <span>
              {active.batch} · {stageLabels[active.stage]} ·{' '}
              {active.sample === 'validated'
                ? 'Physical sample validated'
                : active.sample === 'changes'
                  ? 'Physical sample needs changes'
                  : 'Physical sample pending'}
            </span>
          </div>
          {error && (
            <div className="mr-error" role="alert">
              {error}
              {conflict && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    const fresh = await refresh()
                    const next = fresh?.find((m) => m.id === active.id)
                    if (next) {
                      setActive(next)
                      setConflict(false)
                      setMessage(
                        'Latest model loaded. Your unsaved feedback has been kept; review the new images before saving.',
                      )
                    }
                  }}
                >
                  Load latest, keep my note
                </button>
              )}
            </div>
          )}
          <div className="mr-detail">
            <Gallery model={active} />
            <aside className="mr-review-panel">
              <h3>{active.title}</h3>
              <p className="mr-hint">
                {active.cameraCoverage === 'fineHoles'
                  ? 'Covered camera surround · individual openings'
                  : 'Camera geometry still needs verification'}
              </p>
              {active.supplierURL && (
                <p>
                  <a href={active.supplierURL} target="_blank" rel="noreferrer">
                    Blank supplier ↗
                  </a>
                  <br />
                  {active.supplierVariant}
                </p>
              )}
              {active.references.length > 0 && (
                <section>
                  <h3>Shape & supplier references</h3>
                  {active.references.map((r, i) => (
                    <p key={i}>
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.title} ↗
                      </a>
                      <small className="mr-block">
                        {r.kind === 'finishedCase'
                          ? 'Finished case — shape reference only'
                          : r.kind === 'blank'
                            ? 'Blank reference'
                            : r.kind === 'phone'
                              ? 'Phone dimensions'
                              : 'Physical sample'}
                        {r.notes && ` · ${r.notes}`}
                      </small>
                    </p>
                  ))}
                </section>
              )}
              <details>
                <summary>Preparation notes & dimensions</summary>
                <p className="mr-notes">{active.notes || 'No preparation notes yet.'}</p>
                <small>Geometry version: {active.version.slice(0, 16)}</small>
              </details>
              {active.error && <p className="mr-error">{active.error}</p>}
              <label className="mr-note-label">
                Your feedback
                <textarea
                  value={feedback}
                  disabled={busy}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  maxLength={8000}
                  placeholder="Camera spacing, rim shape, artwork… Mention a view when useful."
                />
              </label>
              <div className="mr-review-buttons">
                <button onClick={() => void decide('note')} disabled={busy || conflict}>
                  Save note
                </button>
                <button
                  onClick={() => void decide('changes')}
                  disabled={busy || conflict || !feedback.trim()}
                >
                  Request changes
                </button>
                <button
                  className="mr-primary"
                  onClick={() => void decide('approved')}
                  disabled={
                    busy ||
                    conflict ||
                    !canReview(active) ||
                    active.cameraCoverage !== 'fineHoles' ||
                    active.status === 'approved'
                  }
                >
                  Approve preview
                </button>
                <button
                  onClick={() => void decide('rejected')}
                  disabled={busy || conflict || !feedback.trim()}
                >
                  Reject model
                </button>
                {['approved', 'rejected', 'changes'].includes(active.status) && (
                  <button
                    onClick={() => void decide('review')}
                    disabled={busy || conflict || !canReview(active)}
                  >
                    Reopen review
                  </button>
                )}
              </div>
              {!canReview(active) && (
                <p className="mr-hint">
                  Approval becomes available when this model’s review package is ready.
                </p>
              )}
              <details>
                <summary>Review history ({active.history.length})</summary>
                <ol className="mr-history">
                  {[...active.history].reverse().map((h, i) => (
                    <li key={i}>
                      <strong>{statusLabels[h.status] ?? h.status}</strong>
                      <small>
                        {new Date(h.at).toLocaleString()} · {h.geometryVersion?.slice(0, 10)}
                      </small>
                      {h.note && <p>{h.note}</p>}
                    </li>
                  ))}
                </ol>
              </details>
              <a
                href={`/admin/collections/caseBlanks/${active.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Edit preparation details in admin ↗
              </a>
            </aside>
          </div>
          <footer className="mr-dialog-footer">
            <button onClick={closeReview} disabled={busy}>
              Back to all models
            </button>
            <span>No automatic next model. Pick whichever you want.</span>
          </footer>
        </Modal>
      )}
      {compare && (
        <Modal title="Compare case models" close={() => setCompare(false)}>
          <p className="mr-hint">
            Choose a view independently for each model. Open its review when you’re ready to leave a
            decision.
          </p>
          <div className="mr-compare">
            {compared.map((m) => (
              <article key={m.id}>
                <h3>{m.phone}</h3>
                <Badge model={m} />
                <Gallery model={m} compact />
                <p>{m.feedback || m.supplierVariant}</p>
                <button
                  onClick={() => {
                    setCompare(false)
                    open(m)
                  }}
                >
                  Review this model ↗
                </button>
              </article>
            ))}
          </div>
        </Modal>
      )}
      {queue && (
        <Modal
          title="Prepare a batch"
          close={() => {
            if (!busy) {
              setQueue(false)
              setError('')
            }
          }}
        >
          <div className="mr-queue">
            <p>
              Choose phones to prepare together. Each gets its own research, geometry, images and
              review. Finished models can arrive in any order.
            </p>
            <p className="mr-hint">
              This creates a preparation worklist. It does not start Blender automatically.
            </p>
            {error && (
              <p role="alert" className="mr-error">
                {error}
              </p>
            )}
            <label>
              Batch name
              <input
                value={batchName}
                maxLength={100}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g. September iPhone collection"
                disabled={busy}
              />
            </label>
            <label>
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={busy}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
            <div className="mr-actions">
              <button disabled={busy} onClick={() => setPhoneIds(initial.phones.map((p) => p.id))}>
                Select all phones
              </button>
              <button disabled={busy} onClick={() => setPhoneIds([])}>
                Clear
              </button>
            </div>
            <div className="mr-phone-list">
              {initial.phones.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    aria-label={`Queue ${p.name}`}
                    checked={phoneIds.includes(p.id)}
                    disabled={busy}
                    onChange={(e) =>
                      setPhoneIds((ids) =>
                        e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id),
                      )
                    }
                  />
                  <span>
                    {p.name}
                    <small>
                      {models.filter((m) => m.phoneId === p.id).length
                        ? 'Already has a library entry; this creates a separate batch candidate.'
                        : 'New candidate — references needed'}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <button
              className="mr-primary"
              disabled={busy || !phoneIds.length || !batchName.trim()}
              onClick={() => void createQueue()}
            >
              {busy ? 'Adding…' : `Queue ${phoneIds.length} models`}
            </button>
          </div>
        </Modal>
      )}
    </main>
  )
}
