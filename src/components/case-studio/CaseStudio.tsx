'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  FolderOpen,
  ImagePlus,
  Move,
  RotateCcw,
  Save,
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
import './studio.css'

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

export default function CaseStudio() {
  const [placement, setPlacement] = useState<Placement>(DEFAULT)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [source, setSource] = useState('')
  const [name, setName] = useState('Your artwork')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<SavedFile[]>([])
  const [view, setView] = useState<View>('artwork')
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [revision, setRevision] = useState(0)
  const imageInput = useRef<HTMLInputElement>(null)
  const projectInput = useRef<HTMLInputElement>(null)
  const viewer = useRef<ViewerHandle>(null)
  const loadVersion = useRef(0)

  useEffect(() => {
    void fetch('/case-studio/files')
      .then((r) => (r.ok ? r.json() : []))
      .then(setSaved)
      .catch(() => {})
  }, [])
  useEffect(() => {
    if (!canvas) return
    drawArtwork(canvas, image, placement)
    setRevision((n) => n + 1)
  }, [canvas, image, placement])

  // Seed the local demo from the original upload, never from a product photo.
  useEffect(() => {
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
  }, [])

  const change = (patch: Partial<Placement>) => setPlacement((p) => ({ ...p, ...patch }))
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
        setName(file.name.replace(/\.[^.]+$/, ''))
        setPlacement((p) => ({ ...p, ...fitPlacement(img, 'portrait', p.printMode) }))
        setMessage('Image ready. Drag it on the flat layout to position it.')
      }
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
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', blob, filename)
      const response = await fetch('/case-studio/files', { method: 'POST', body: form })
      if (!response.ok) throw new Error(await response.text())
      const result: SavedFile = await response.json()
      setSaved((previous) => [result, ...previous].slice(0, 20))
      download(blob, filename)
      setMessage(message + ' Available in Saved files below.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.')
    } finally {
      setBusy(false)
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
    <main className="case-studio">
      <header className="cs-header">
        <Link href="/?device=desktop" className="cs-brand">
          <ArrowLeft size={16} /> CASE / STUDIO
        </Link>
        <span className="cs-local">
          <i /> Local workspace
        </span>
        <button
          className="cs-text-button"
          onClick={() => projectInput.current?.click()}
          disabled={busy}
        >
          <FolderOpen size={16} /> Open project
        </button>
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
      <div className="cs-workspace">
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
            <p className="cs-note">Your artwork stays on this computer.</p>
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
          <div className="cs-export-buttons">
            <button className="cs-primary" disabled={!image || busy} onClick={saveLayout}>
              <Download size={16} /> Export layout
            </button>
            <button disabled={!image || busy} onClick={() => void savePreview()}>
              <Download size={15} /> Save 3D view
            </button>
            <button disabled={!image || busy} onClick={saveProject}>
              <Save size={15} /> Save project
            </button>
          </div>
          <p className="cs-note">
            Save a project to keep editing later.
            <br />
            Layout: {printBounds.width} × {printBounds.height} px.
          </p>
        </aside>
      </div>
      {saved.length > 0 && (
        <section className="cs-saved" aria-label="Saved files">
          <div>
            <h2>Saved files</h2>
            <p>Local copies of your projects and exports.</p>
          </div>
          <div className="cs-saved-list">
            {saved.map((file) => (
              <div className="cs-saved-file" key={file.file}>
                <span title={file.name}>{file.name}</span>
                {file.project ? (
                  <button disabled={busy} onClick={() => void reopen(file)}>
                    Reopen project <ArrowUpRight size={13} />
                  </button>
                ) : (
                  <a href={file.url} target="_blank" rel="noreferrer">
                    View image <ArrowUpRight size={13} />
                  </a>
                )}
              </div>
            ))}
          </div>
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
