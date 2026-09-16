'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  FolderOpen,
  ImagePlus,
  Move,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react'
import FlatLayoutEditor from './FlatLayoutEditor'
import CaseViewer, { type View, type ViewerHandle } from './CaseViewer'
import {
  DEFAULT,
  HEIGHT,
  MODEL,
  PX,
  WIDTH,
  createPrintExport,
  exportBounds,
  download,
  drawArtwork,
  fitPlacement,
  loadImage,
  parseProject,
  readFile,
  type Placement,
} from './artwork'
import { CatalogFields } from './CatalogFields'
import {
  effectiveDPI,
  emptyDetails,
  validateSave,
  type StudioDetails,
  type StudioDocument,
} from '@/lib/studio/contract'
import './studio.css'
import { CatalogWorkflow } from '@/components/catalog-studio/CatalogWorkflow'
import { PhoneFits } from '@/components/catalog-studio/PhoneFits'
import type { ModelSettings } from '@/lib/studio/modelSettings'
import type { StudioPhone } from '@/lib/studio-publish/types'
import { receiveArtwork, transferArtwork } from '@/lib/studio-publish/handoff'

type SavedFile = { file: string; name: string; url: string; project: boolean }

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="cs-slider">
      <span>
        {label}
        <output>
          {Math.round(value * 10) / 10}
          {suffix}
        </output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export default function CaseStudio({ catalog = false }: { catalog?: boolean }) {
  const [details, setDetails] = useState<StudioDetails>(emptyDetails)
  const [drafts, setDrafts] = useState<StudioDocument[]>([])
  const [collections, setCollections] = useState<{ id: number; title: string }[]>([])
  const [currentDraft, setCurrentDraft] = useState<StudioDocument | null>(null)
  const [geometryVersion, setGeometryVersion] = useState('')
  const [models, setModels] = useState<StudioPhone[]>([])
  const [modelsReady, setModelsReady] = useState(false)
  const [modelError, setModelError] = useState('')
  const [modelSettings, setModelSettings] = useState<ModelSettings | null>(null)
  const [editorMode, setEditorMode] = useState<'shared' | 'phones'>('shared')
  const [activePhone, setActivePhone] = useState<number | null>(null)
  const fitViewer = useRef<ViewerHandle>(null)
  const editorTabs = useRef<HTMLDivElement>(null)
  const settings = modelSettings ?? { phones: models.map((m) => m.id), placements: {} }
  const changeModelSettings = (next: ModelSettings) => {
    setModelSettings(next)
    setDirty(true)
  }
  const editPhone = (id?: number) => {
    if (id) setActivePhone(id)
    setEditorMode('phones')
    editorTabs.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const [dirty, setDirty] = useState(false)
  const [catalogReady, setCatalogReady] = useState(!catalog)
  const [placement, setPlacement] = useState<Placement>(DEFAULT)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [source, setSource] = useState('')
  const [name, setName] = useState('Your artwork')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<SavedFile[]>([])
  const [deleted, setDeleted] = useState<SavedFile[]>([])
  const [movingFile, setMovingFile] = useState<string | null>(null)
  const fileMutation = useRef(false)
  const [view, setView] = useState<View>('artwork')
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [revision, setRevision] = useState(0)
  const imageInput = useRef<HTMLInputElement>(null)
  const projectInput = useRef<HTMLInputElement>(null)
  const viewer = useRef<ViewerHandle>(null)
  const loadVersion = useRef(0)
  const saving = useRef(false)
  useEffect(() => {
    if (!catalog) return
    let cancelled = false
    fetch('/api/catalog-studio/render')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Could not load case models.')
        if (!cancelled) {
          setModels(data.models)
          setModelsReady(true)
        }
      })
      .catch((e) => {
        if (!cancelled) setModelError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [catalog])
  function designURL(product?: number) {
    const url = new URL(window.location.href)
    url.searchParams.delete('revision')
    if (product) url.searchParams.set('product', String(product))
    else url.searchParams.delete('product')
    window.history.replaceState(null, '', url)
  }
  useEffect(() => {
    if (!catalog || !dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [catalog, dirty])

  useEffect(() => {
    if (catalog) return
    void fetch('/case-studio/files')
      .then((r) => (r.ok ? r.json() : []))
      .then(setSaved)
      .catch(() => {})
    void fetch('/case-studio/files?deleted=1')
      .then((r) => (r.ok ? r.json() : []))
      .then(setDeleted)
      .catch(() => {})
  }, [catalog])
  useEffect(() => {
    if (!canvas) return
    drawArtwork(canvas, image, placement)
    setRevision((n) => n + 1)
  }, [canvas, image, placement])

  // Seed the local demo from the original upload, never from a product photo.
  useEffect(() => {
    if (catalog) return
    let cancelled = false
    const version = loadVersion.current
    void (async () => {
      try {
        const response = await fetch('/case-studio/example')
        if (!response.ok) return
        const data = await readFile(await response.blob())
        const img = await loadImage(data)
        if (cancelled || loadVersion.current !== version) return
        setSource(data)
        setImage(img)
        setName('Gohan — placement study')
        setPlacement({ ...DEFAULT, ...fitPlacement(img, 'portrait') })
      } catch {
        /* An example is optional; uploads work without it. */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [catalog])

  useEffect(() => {
    if (!catalog) return
    let cancelled = false
    void fetch('/api/catalog-studio')
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        if (cancelled) return
        setDrafts(result.drafts)
        setCollections(result.collections)
        setGeometryVersion(result.geometryVersion)
        setCatalogReady(true)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Could not load your catalog.')
      })
    return () => {
      cancelled = true
    }
  }, [catalog])
  useEffect(() => {
    if (!catalog || !catalogReady || sessionStorage.getItem('case-studio:pending-import') !== '1')
      return
    sessionStorage.removeItem('case-studio:pending-import')
    void receiveArtwork()
      .then(async (transfer) => {
        if (!transfer) return
        const img = await loadImage(transfer.image)
        ++loadVersion.current
        setSource(transfer.image)
        setImage(img)
        setPlacement(transfer.placement)
        setName(transfer.name)
        setDetails({
          ...emptyDetails,
          title: transfer.name,
          slug: transfer.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 100),
        })
        setDirty(true)
        setMessage(
          'Your artwork and placement are here. Add design details and save a draft below.',
        )
      })
      .catch(() =>
        setError('Could not transfer this artwork. Open your saved project here to continue.'),
      )
  }, [catalog, catalogReady])

  const change = (patch: Partial<Placement>) => {
    setPlacement((p) => ({ ...p, ...patch }))
    setDirty(true)
  }
  const changeDetails = (patch: Partial<StudioDetails>) => {
    setDetails((d) => ({ ...d, ...patch }))
    setDirty(true)
  }
  async function openDraft(id: number, by: 'product' | 'revision' = 'product') {
    if (dirty && !window.confirm('Discard unsaved changes and open this draft?')) return
    const version = ++loadVersion.current
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/catalog-studio?${by}=${id}`)
      const doc: StudioDocument & { error?: string } = await response.json()
      if (!response.ok) throw new Error(doc.error)
      if (!doc.currentGeometry)
        throw new Error(
          'This revision uses a different case model version. Keep its saved layout; model migration will need a placement review.',
        )
      const original = await fetch(doc.originalURL)
      if (!original.ok)
        throw new Error('Could not load the private original. Sign in again and retry.')
      const data = await readFile(await original.blob())
      const img = await loadImage(data)
      if (version !== loadVersion.current) return
      setSource(data)
      setImage(img)
      setPlacement(doc.placement)
      setDetails(doc.details)
      setName(doc.title)
      setCurrentDraft(doc)
      setModelSettings(doc.modelSettings ?? null)
      setEditorMode('phones')
      setActivePhone(null)
      designURL(doc.product)
      setDirty(Boolean(doc.detailsChanged))
      setMessage(
        doc.detailsChanged
          ? 'Your latest admin details are loaded with the saved artwork. Save changes to include them in the next previews.'
          : 'Your latest saved design is open.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open draft.')
    } finally {
      if (version === loadVersion.current) setBusy(false)
    }
  }
  useEffect(() => {
    if (!catalog || !catalogReady) return
    const params = new URLSearchParams(window.location.search)
    const by = params.has('product') ? 'product' : 'revision'
    const id = params.get(by)
    if (id && /^[1-9]\d*$/.test(id)) void openDraft(Number(id), by)
  }, [catalog, catalogReady])
  async function addToCatalog() {
    if (!source || busy) return
    setBusy(true)
    try {
      await transferArtwork({ image: source, name, placement })
      sessionStorage.setItem('case-studio:pending-import', '1')
      window.location.assign('/catalog-studio')
    } catch {
      setError('Could not transfer the artwork. Save your project and open it in Catalog Studio.')
      setBusy(false)
    }
  }
  async function saveDraft() {
    if (!image || !source || !modelsReady || busy || saving.current || (currentDraft && !dirty))
      return
    saving.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const saveSettings = validateSave({
        previous: currentDraft?.id ?? null,
        model: MODEL.slug,
        details,
        placement,
        modelSettings: settings,
      })
      const sharedCanvas = document.createElement('canvas')
      sharedCanvas.width = WIDTH
      sharedCanvas.height = HEIGHT
      drawArtwork(sharedCanvas, image, placement)
      const exported = createPrintExport(sharedCanvas, placement.printMode)
      const print = await new Promise<Blob>((resolve, reject) =>
        exported.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Could not prepare the layout.'))),
          'image/png',
        ),
      )
      const form = new FormData()
      form.append('settings', JSON.stringify(saveSettings))
      form.append('geometryVersion', geometryVersion)
      form.append('original', await (await fetch(source)).blob(), 'original')
      form.append('print', print, 'layout.png')
      const preview = await (editorMode === 'phones' ? fitViewer : viewer).current?.snapshot()
      if (preview) form.append('preview', preview, 'preview.png')
      const response = await fetch('/api/catalog-studio', { method: 'POST', body: form })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save draft.')
      setCurrentDraft(result)
      setModelSettings(result.modelSettings ?? null)
      designURL(result.product)
      setDetails(result.details)
      setName(result.title)
      setDirty(false)
      setDrafts((previous) => [result, ...previous.filter((d) => d.product !== result.product)])
      setMessage(
        result.unchanged
          ? 'Everything is already saved.'
          : currentDraft
            ? 'Changes saved to this design. Generate updated previews below when you’re ready.'
            : 'Design created. Choose phones and generate previews below.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save draft.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  function newDesign() {
    if (dirty && !window.confirm('Discard unsaved changes and start a new design?')) return
    ++loadVersion.current
    setCurrentDraft(null)
    designURL()
    setDetails(emptyDetails)
    setSource('')
    setImage(null)
    setPlacement(DEFAULT)
    setModelSettings(null)
    setActivePhone(null)
    setEditorMode('shared')
    setName('Your artwork')
    setDirty(false)
    setError('')
    setMessage('')
  }
  const fit = (mode: 'portrait' | 'fill') => {
    if (image) change(fitPlacement(image, mode, placement.printMode))
  }

  async function openFile(file: File, project = false) {
    const version = ++loadVersion.current
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const limit = project ? 41 : 30
      if (file.size > limit * 1024 * 1024)
        throw new Error(`Choose a file smaller than ${limit} MB.`)
      if (project) {
        const saved = parseProject(JSON.parse(await file.text()))
        const img = await loadImage(saved.image)
        if (version !== loadVersion.current) return
        setImage(img)
        setSource(saved.image)
        setName(saved.name)
        setPlacement(saved.placement)
        setMessage('Project opened. Your placement is restored.')
      } else {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
          throw new Error('Choose a JPG, PNG, or WebP image.')
        const data = await readFile(file)
        const img = await loadImage(data)
        if (img.naturalWidth * img.naturalHeight > 50_000_000)
          throw new Error('This image is very large. Resize it below 50 megapixels and try again.')
        if (version !== loadVersion.current) return
        setImage(img)
        setSource(data)
        const title = file.name.replace(/\.[^.]+$/, '')
        setName(title)
        if (catalog && !details.title)
          setDetails((d) => ({
            ...d,
            title,
            slug: title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
              .slice(0, 100),
          }))
        setPlacement((p) => ({ ...p, ...fitPlacement(img, 'portrait', p.printMode) }))
        setMessage('Image ready. Drag it on the flat layout to position it.')
      }
      setDirty(true)
    } catch (e) {
      if (version === loadVersion.current)
        setError(e instanceof Error ? e.message : 'Could not open this file.')
    } finally {
      if (version === loadVersion.current) setBusy(false)
    }
  }

  const fileName =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90) || 'case-artwork'
  async function saveLocal(blob: Blob, filename: string, message: string) {
    if (catalog) {
      download(blob, filename)
      setMessage(message)
      return
    }
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', blob, filename)
      const response = await fetch('/case-studio/files', { method: 'POST', body: form })
      if (!response.ok) throw new Error(await response.text())
      const result: SavedFile = await response.json()
      setSaved((previous) => [result, ...previous])
      download(blob, filename)
      setMessage(message + ' Available in Saved files below.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  async function moveSavedFile(file: SavedFile, restore = false) {
    return moveSavedFiles([file], restore)
  }
  async function moveSavedFiles(files: SavedFile[], restore = false) {
    if (fileMutation.current || !files.length) return
    fileMutation.current = true
    setMovingFile(files.length === 1 ? files[0].file : 'all')
    const moved: SavedFile[] = []
    const errors: string[] = []
    try {
      for (const file of files) {
        try {
          const response = await fetch(file.url, { method: restore ? 'PATCH' : 'DELETE' })
          if (!response.ok) throw new Error(await response.text())
          moved.push(file)
        } catch (e) {
          errors.push(e instanceof Error ? e.message : 'Could not update this saved file.')
        }
      }
      const ids = new Set(moved.map((file) => file.file))
      if (restore) {
        setDeleted((current) => current.filter((entry) => !ids.has(entry.file)))
        setSaved((current) => [...moved, ...current.filter((entry) => !ids.has(entry.file))])
        if (moved.length)
          toast.success(moved.length === 1 ? 'File restored.' : `${moved.length} files restored.`)
      } else {
        setSaved((current) => current.filter((entry) => !ids.has(entry.file)))
        setDeleted((current) => [...moved, ...current.filter((entry) => !ids.has(entry.file))])
        if (moved.length)
          toast(moved.length === 1 ? 'File deleted.' : `${moved.length} files cleared.`, {
            duration: 10000,
            action: { label: 'Undo', onClick: () => void moveSavedFiles(moved, true) },
          })
      }
      if (errors.length)
        toast.error(
          `${errors.length} ${errors.length === 1 ? 'file could' : 'files could'} not be moved. ${errors[0]}`,
        )
    } finally {
      fileMutation.current = false
      setMovingFile(null)
    }
  }
  async function reopen(file: SavedFile) {
    setError('')
    try {
      const response = await fetch(file.url)
      if (!response.ok) throw new Error('The saved file could not be opened.')
      await openFile(
        new File([await response.blob()], file.name, { type: 'application/json' }),
        true,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this project.')
    }
  }
  const printBounds = exportBounds(placement.printMode)
  const modeName = placement.printMode === 'back' ? 'back-only' : 'wraparound'
  const saveLayout = () => {
    if (!canvas) return
    createPrintExport(canvas, placement.printMode).toBlob((blob) => {
      if (blob) {
        void saveLocal(
          blob,
          `${fileName}-${modeName}-layout.png`,
          `Layout saved at ${printBounds.width} × ${printBounds.height} px, without guides.`,
        )
      }
    }, 'image/png')
  }
  const saveProject = () => {
    void saveLocal(
      new Blob(
        [
          JSON.stringify(
            { version: 1, model: MODEL.slug, name, image: source, placement },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
      `${fileName}-${modeName}.case-studio.json`,
      'Project saved with your image, placement, and print area.',
    )
  }
  const savePreview = async () => {
    const blob = await viewer.current?.snapshot()
    if (blob) {
      await saveLocal(blob, `${fileName}-${modeName}-preview.png`, 'Saved the current 3D view.')
    } else setError('3D preview is unavailable. You can still export the flat layout.')
  }

  return (
    <main className={`case-studio${catalog ? ' cs-catalog' : ''}`}>
      <header className="cs-header">
        <a href={catalog ? '/catalog-studio/designs' : '/?device=desktop'} className="cs-brand">
          <ArrowLeft size={16} /> CASE / STUDIO
        </a>
        <span className="cs-local">
          <i /> {catalog ? 'Private catalog workspace' : 'Local workspace'}
        </span>
        <button
          className="cs-text-button"
          onClick={() => projectInput.current?.click()}
          disabled={busy}
        >
          <FolderOpen size={16} /> Open project
        </button>
        {!catalog && (
          <button
            className="cs-primary"
            disabled={!image || busy}
            onClick={() => void addToCatalog()}
          >
            Add to catalog <ArrowUpRight size={16} />
          </button>
        )}
      </header>
      <section className="cs-heading">
        <div>
          <p className="cs-eyebrow">YOUR ART. YOUR CASE.</p>
          <h1>
            Make it yours<span>.</span>
          </h1>
        </div>
        <p>
          Find the right crop.
          <br />
          See every angle.
        </p>
      </section>
      {catalog && (
        <section className="cs-catalog-toolbar" aria-label="Catalog drafts">
          <div>
            <strong>{currentDraft ? `Editing ${currentDraft.title}` : 'New design'}</strong>
            <span>
              {dirty
                ? 'Unsaved changes'
                : currentDraft
                  ? 'All changes saved'
                  : 'Upload artwork to begin'}
            </span>
          </div>
          <div className="cs-catalog-actions">
            <button disabled={busy} onClick={newDesign}>
              New design
            </button>
            <select
              aria-label="Open saved catalog draft"
              value=""
              disabled={busy || !catalogReady}
              onChange={(e) => {
                if (e.target.value) void openDraft(Number(e.target.value))
              }}
            >
              <option value="">Open a saved draft…</option>
              {drafts.map((d) => (
                <option key={d.product} value={d.product}>
                  {d.title}
                </option>
              ))}
            </select>
            <button
              className="cs-primary"
              disabled={
                !image || busy || !catalogReady || !modelsReady || (!!currentDraft && !dirty)
              }
              onClick={() => void saveDraft()}
            >
              {busy
                ? 'Saving…'
                : currentDraft
                  ? dirty
                    ? 'Save changes'
                    : 'Saved'
                  : 'Create design'}
            </button>
          </div>
        </section>
      )}
      {catalog && (
        <div className="cw-editor-tabs" ref={editorTabs} aria-label="Design editing mode">
          <div role="group" aria-label="Choose editing workspace">
            <button
              aria-pressed={editorMode === 'shared'}
              onClick={() => setEditorMode('shared')}
              disabled={busy}
            >
              Shared artwork
            </button>
            <button
              aria-pressed={editorMode === 'phones'}
              onClick={() => setEditorMode('phones')}
              disabled={busy || !image}
            >
              Fit by phone · {models.length}
            </button>
          </div>
          <p>
            {editorMode === 'shared'
              ? 'Set the starting artwork for every case. Phones with custom fits keep their own placement.'
              : 'Edit any phone without changing the others. Save changes keeps all fits in this design.'}
          </p>
        </div>
      )}
      {catalog && modelError && (
        <p role="alert" className="cw-error">
          {modelError} Reload the page to retry.
        </p>
      )}
      {catalog && editorMode === 'phones' && (
        <div inert={busy}>
          {!modelsReady ? (
            <p role="status">Loading approved case models…</p>
          ) : (
            <PhoneFits
              models={models}
              settings={settings}
              shared={placement}
              source={source}
              aspect={image ? image.naturalWidth / image.naturalHeight : 1}
              active={activePhone}
              onActive={setActivePhone}
              onChange={changeModelSettings}
              viewerRef={fitViewer}
            />
          )}
        </div>
      )}
      {(!catalog || editorMode === 'shared') && (
        <div className="cs-workspace" inert={busy || (catalog && !catalogReady)}>
          <aside className="cs-controls">
            <section className="cs-section">
              <div className="cs-section-title">
                <span>01 / Artwork</span>
                <span>JPG · PNG · WebP</span>
              </div>
              <button
                className="cs-upload"
                disabled={busy}
                onClick={() => imageInput.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) void openFile(file)
                }}
              >
                <ImagePlus size={25} strokeWidth={1.4} />
                <strong>{busy ? 'Opening…' : image ? 'Replace image' : 'Upload an image'}</strong>
                <span>Choose a file or drop it here</span>
              </button>
              <p className="cs-file-name" title={name}>
                {image ? name : 'A blank canvas, ready for you.'}
              </p>
              <p className="cs-note">
                {catalog
                  ? 'Saved originals and print layouts are private to your admin account.'
                  : 'Your artwork stays on this computer.'}
              </p>
              {image && (
                <p className="cs-note">
                  {image.naturalWidth} × {image.naturalHeight} px · about{' '}
                  {effectiveDPI(image.naturalWidth, placement.width, PX)} DPI at this placement.
                  {effectiveDPI(image.naturalWidth, placement.width, PX) < 150
                    ? ' Enlarge less or use a higher-resolution image for finer detail.'
                    : ' Check fine detail on a physical sample.'}
                </p>
              )}
            </section>
            <section className="cs-section">
              <div className="cs-section-title">
                <span>02 / Print area</span>
              </div>
              <div className="cs-print-options" role="group" aria-label="Print area">
                <button
                  aria-pressed={placement.printMode === 'wrap'}
                  onClick={() => change({ printMode: 'wrap' })}
                >
                  <strong>Wraparound</strong>
                  <span>Back, sides & camera surround</span>
                </button>
                <button
                  aria-pressed={placement.printMode === 'back'}
                  onClick={() => change({ printMode: 'back' })}
                >
                  <strong>Back only</strong>
                  <span>Back & camera surround · solid sides</span>
                </button>
              </div>
            </section>
            <section className="cs-section">
              <div className="cs-section-title">
                <span>03 / Placement</span>
                <button
                  aria-label="Reset placement"
                  title="Reset placement"
                  onClick={() => {
                    fit('portrait')
                  }}
                  disabled={!image}
                >
                  <RotateCcw size={14} />
                </button>
              </div>
              <div className="cs-preset-row">
                <button disabled={!image} onClick={() => fit('portrait')}>
                  Portrait fit
                </button>
                <button disabled={!image} onClick={() => fit('fill')}>
                  Fill case <ArrowUpRight size={13} />
                </button>
              </div>
              <Slider
                label="Image width"
                value={placement.width / PX}
                min={2}
                max={(WIDTH * 4) / PX}
                step={0.1}
                suffix=" mm"
                onChange={(width) => change({ width: width * PX })}
              />
              <Slider
                label="Horizontal"
                value={placement.x / PX}
                min={-WIDTH / PX}
                max={(WIDTH * 2) / PX}
                step={0.1}
                suffix=" mm"
                onChange={(x) => change({ x: x * PX })}
              />
              <Slider
                label="Vertical"
                value={placement.y / PX}
                min={-HEIGHT / PX}
                max={(HEIGHT * 2) / PX}
                step={0.1}
                suffix=" mm"
                onChange={(y) => change({ y: y * PX })}
              />
              <Slider
                label="Rotation"
                value={placement.rotation}
                min={-180}
                max={180}
                suffix="°"
                onChange={(rotation) => change({ rotation })}
              />
            </section>
            <section className="cs-section cs-finish">
              <div className="cs-section-title">
                <span>04 / Finish</span>
              </div>
              <div className="cs-colors">
                <label>
                  Background
                  <input
                    aria-label="Artwork background color"
                    type="color"
                    value={placement.background}
                    onChange={(e) => change({ background: e.target.value })}
                  />
                </label>
                <label>
                  Case & rim
                  <input
                    aria-label="Case and rim color"
                    type="color"
                    value={placement.silicone}
                    onChange={(e) => change({ silicone: e.target.value })}
                  />
                </label>
              </div>
            </section>
          </aside>
          <section className="cs-stage" aria-label="3D case preview">
            <div className="cs-stage-heading">
              <span>iPhone 17 Pro Max</span>
              <span className="cs-live">
                <i /> Live 3D
              </span>
            </div>
            {catalog && (
              <p className="cs-model-note">
                Shared placement reference ·{' '}
                <a href="/catalog-studio/models" target="_blank" rel="noreferrer">
                  Review case model library
                </a>
              </p>
            )}
            <CaseViewer
              ref={viewer}
              canvas={canvas}
              revision={revision}
              silicone={placement.silicone}
              view={view}
            />
            <div className="cs-view-controls" aria-label="Preview angle">
              {(['artwork', 'angle', 'inside'] as const).map((v) => (
                <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
                  {v === 'artwork' ? 'Artwork' : v === 'angle' ? 'Angle' : 'Inside'}
                </button>
              ))}
            </div>
            <p className="cs-orbit-help">Drag to rotate · Scroll or pinch to zoom</p>
          </section>
          <aside className="cs-layout-panel">
            <div className="cs-section-title">
              <span>Flat layout</span>
              <Move size={14} />
            </div>
            <p className="cs-layout-intro">
              Drag the artwork here.
              <br />
              The case updates as you move.
            </p>
            <FlatLayoutEditor
              canvasRef={setCanvas}
              placement={placement}
              hasImage={!!image}
              onChange={change}
            />
            <div className="cs-legend">
              <span>
                <i /> {placement.printMode === 'back' ? 'Printable back' : 'Case back'}
              </span>
              <span>
                {placement.printMode === 'back' ? 'Checks = no print' : 'Outside = edge wrap'}
              </span>
            </div>
            <p className="cs-note">
              {placement.printMode === 'back'
                ? 'Artwork covers the back and camera surround. Sides stay solid; lens and sensor openings are transparent in the export.'
                : 'Artwork continues over the sides and camera surround. Camera guides won’t appear in the export.'}
            </p>
            {catalog && (
              <div className="cs-draft-summary">
                <strong>
                  {currentDraft
                    ? dirty
                      ? 'Changes to save'
                      : 'All changes saved'
                    : 'Create a catalog draft'}
                </strong>
                <p>
                  Your image, placement and print layout are saved together. Choose phones and
                  generate previews below, then review your product page before publishing.
                </p>
                <button
                  className="cs-primary"
                  disabled={
                    !image || busy || !catalogReady || !modelsReady || (!!currentDraft && !dirty)
                  }
                  onClick={() => void saveDraft()}
                >
                  {currentDraft ? (dirty ? 'Save changes' : 'Saved') : 'Create design'}
                </button>
                {currentDraft && (
                  <>
                    <a
                      href={`/admin/collections/products/${currentDraft.product}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open product draft ↗
                    </a>
                    <a href={currentDraft.printURL} target="_blank" rel="noreferrer">
                      View saved print layout ↗
                    </a>
                    {currentDraft.previewURL && (
                      <a href={currentDraft.previewURL} target="_blank" rel="noreferrer">
                        View saved 3D preview ↗
                      </a>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="cs-export-buttons">
              <button className="cs-primary" disabled={!image || busy} onClick={saveLayout}>
                <Download size={16} /> Export layout
              </button>
              <button disabled={!image || busy} onClick={() => void savePreview()}>
                <Download size={15} /> Save 3D view
              </button>
              <button disabled={!image || busy} onClick={saveProject}>
                <Save size={15} /> {catalog ? 'Download project' : 'Save project'}
              </button>
            </div>
            <p className="cs-note">
              {catalog
                ? 'Use the catalog save button to keep editing here. Downloads are optional copies.'
                : 'Save a project to keep editing later.'}
              <br />
              Layout: {printBounds.width} × {printBounds.height} px.
            </p>
          </aside>
        </div>
      )}
      {catalog && (
        <section className="cs-details-panel" aria-label="Catalog design details">
          <CatalogFields
            details={details}
            change={changeDetails}
            collections={collections}
            disabled={busy || !catalogReady}
          />
          <button
            className="cs-primary"
            disabled={!image || busy || !catalogReady || !modelsReady || (!!currentDraft && !dirty)}
            onClick={() => void saveDraft()}
          >
            {currentDraft ? (dirty ? 'Save changes' : 'Saved') : 'Create design'}
          </button>
        </section>
      )}
      {catalog && (
        <CatalogWorkflow
          draft={currentDraft}
          dirty={dirty}
          saving={busy}
          models={models}
          settings={settings}
          onSettings={changeModelSettings}
          onEditPhone={editPhone}
        />
      )}
      {!catalog && (saved.length > 0 || deleted.length > 0) && (
        <section className="cs-saved" aria-label="Saved files">
          <div>
            <h2>Saved files</h2>
            <p>Local copies of your projects and exports. Deleted files can be restored below.</p>
            {saved.length > 0 && (
              <button
                className="cs-clear-files"
                disabled={busy || movingFile !== null}
                onClick={() => void moveSavedFiles(saved)}
              >
                <Trash2 size={14} /> {movingFile === 'all' ? 'Clearing…' : 'Clear all'}
              </button>
            )}
          </div>
          {saved.length > 0 && (
            <div className="cs-saved-list">
              {saved.map((file) => (
                <div className="cs-saved-file" key={file.file}>
                  <span title={file.name}>{file.name}</span>
                  <div className="cs-saved-actions">
                    {file.project ? (
                      <button disabled={busy} onClick={() => void reopen(file)}>
                        Reopen project <ArrowUpRight size={13} />
                      </button>
                    ) : (
                      <a href={file.url} target="_blank" rel="noreferrer">
                        View image <ArrowUpRight size={13} />
                      </a>
                    )}
                    <button
                      className="cs-delete-file"
                      aria-label={`Delete ${file.name}`}
                      disabled={busy || movingFile !== null}
                      onClick={() => void moveSavedFile(file)}
                    >
                      <Trash2 size={13} /> {movingFile === file.file ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {saved.length === 0 && <p>No saved files. Your current artwork is still open above.</p>}
          {deleted.length > 0 && (
            <details className="cs-deleted">
              <summary>Deleted files ({deleted.length})</summary>
              <div className="cs-saved-list">
                {deleted.map((file) => (
                  <div className="cs-saved-file" key={file.file}>
                    <span title={file.name}>{file.name}</span>
                    <button
                      disabled={movingFile !== null}
                      aria-label={`Restore ${file.name}`}
                      onClick={() => void moveSavedFile(file, true)}
                    >
                      <RotateCcw size={13} /> {movingFile === file.file ? 'Restoring…' : 'Restore'}
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      )}
      <footer className="cs-footer">
        <span>One case. Endless possibilities.</span>
        <p>Placement prototype · Dimensions and curved-edge fit await a physical sample.</p>
      </footer>
      {(message || error) && (
        <p className={`cs-message${error ? ' cs-error' : ''}`} role={error ? 'alert' : 'status'}>
          {error || message}
          <button
            aria-label="Dismiss message"
            onClick={() => {
              setMessage('')
              setError('')
            }}
          >
            ×
          </button>
        </p>
      )}
      <input
        ref={imageInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void openFile(file)
        }}
      />
      <input
        ref={projectInput}
        type="file"
        accept=".json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void openFile(file, true)
        }}
      />
    </main>
  )
}
