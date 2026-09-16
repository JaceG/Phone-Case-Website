'use client'
import { useEffect, useState, type Ref } from 'react'
import CaseViewer, { type View, type ViewerHandle } from '@/components/case-studio/CaseViewer'
import FlatLayoutEditor from '@/components/case-studio/FlatLayoutEditor'
import type { Placement } from '@/components/case-studio/artwork'
import { artworkSVG, template } from '@/lib/studio-publish/placement'
import type { StudioPhone } from '@/lib/studio-publish/types'

export function ModelPlacement({
  phone,
  source,
  aspect,
  placement,
  onChange,
  onReset,
  viewerRef,
}: {
  phone: StudioPhone
  source: string
  aspect: number
  placement: Placement
  onChange: (p: Placement) => void
  onReset: () => void
  viewerRef?: Ref<ViewerHandle>
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [revision, setRevision] = useState(0)
  const [view, setView] = useState<View>('artwork')
  const [error, setError] = useState('')
  const t = template(phone.params)
  const change = (patch: Partial<Placement>) => onChange({ ...placement, ...patch })
  useEffect(() => {
    if (!canvas || !source) return
    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      canvas.width = t.width
      canvas.height = t.height
      canvas.getContext('2d')!.drawImage(image, 0, 0)
      setRevision((n) => n + 1)
      setError('')
    }
    image.onerror = () => {
      if (!cancelled) setError('Could not load the artwork preview. Try opening the design again.')
    }
    image.src =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(artworkSVG(phone.params, placement, source, aspect))
    return () => {
      cancelled = true
    }
  }, [canvas, source, aspect, phone, placement, t.width, t.height])
  return (
    <div className="cw-placement">
      <div className="cw-model-preview">
        <div className="cw-model-view">
          <CaseViewer
            ref={viewerRef}
            canvas={canvas}
            revision={revision}
            silicone={placement.silicone}
            geometry={phone.geometryURL}
            view={view}
          />
        </div>
        <div className="cs-view-controls" aria-label="Phone preview angle">
          {(['artwork', 'angle', 'inside'] as const).map((v) => (
            <button key={v} aria-pressed={v === view} onClick={() => setView(v)}>
              {v === 'artwork' ? 'Artwork' : v === 'angle' ? 'Angle' : 'Inside'}
            </button>
          ))}
        </div>
        <p>Drag the 3D case to rotate. Its scroll zoom only changes your view.</p>
      </div>
      <div className="cw-fit-controls">
        <h3>Fit on {phone.name}</h3>
        <p>
          Drag the flat artwork to move it. Use + / −, scroll or pinch to resize the image on this
          case.
        </p>
        <FlatLayoutEditor
          geometry={phone.params}
          canvasRef={setCanvas}
          placement={placement}
          hasImage={!!source}
          onChange={change}
        />
        <label>
          Print area
          <select
            value={placement.printMode}
            onChange={(e) => change({ printMode: e.target.value as Placement['printMode'] })}
          >
            <option value="back">Back & camera surround · solid sides</option>
            <option value="wrap">Wraparound · back, sides & camera surround</option>
          </select>
        </label>
        <label>
          Rotation · {Math.round(placement.rotation)}°
          <input
            aria-label="Model artwork rotation"
            type="range"
            min={-180}
            max={180}
            value={placement.rotation}
            onChange={(e) => change({ rotation: Number(e.target.value) })}
          />
        </label>
        <div className="cs-colors">
          <label>
            Background
            <input
              aria-label="Model background color"
              type="color"
              value={placement.background}
              onChange={(e) => change({ background: e.target.value })}
            />
          </label>
          <label>
            Case & rim
            <input
              aria-label="Model case color"
              type="color"
              value={placement.silicone}
              onChange={(e) => change({ silicone: e.target.value })}
            />
          </label>
        </div>
        <button type="button" onClick={onReset}>
          Reset this phone to shared fit
        </button>
        <p>
          Only this phone’s fit changes. Use Save changes above to keep every phone’s adjustments in
          this draft.
        </p>
        {error && (
          <p role="alert" className="cw-error">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
