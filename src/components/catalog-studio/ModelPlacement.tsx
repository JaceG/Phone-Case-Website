'use client'
import { useEffect, useRef, useState } from 'react'
import CaseViewer from '@/components/case-studio/CaseViewer'
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
}: {
  phone: StudioPhone
  source: string
  aspect: number
  placement: Placement
  onChange: (p: Placement) => void
  onReset: () => void
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null),
    [revision, setRevision] = useState(0)
  const drag = useRef<{ x: number; y: number; p: Placement } | null>(null)
  const t = template(phone.params)
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
    }
    image.src =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(artworkSVG(phone.params, placement, source, aspect))
    return () => {
      cancelled = true
    }
  }, [canvas, source, aspect, phone, placement, t.width, t.height])
  useEffect(() => {
    if (!canvas) return
    const zoom = (event: WheelEvent) => {
      event.preventDefault()
      onChange({
        ...placement,
        width: Math.max(
          20,
          Math.min(t.width * 4, placement.width * Math.exp(-event.deltaY * 0.002)),
        ),
      })
    }
    canvas.addEventListener('wheel', zoom, { passive: false })
    return () => canvas.removeEventListener('wheel', zoom)
  }, [canvas, placement, onChange, t.width])
  return (
    <div className="cw-placement">
      <div className="cw-model-view">
        <CaseViewer
          canvas={canvas}
          revision={revision}
          silicone={placement.silicone}
          geometry={phone.geometryURL}
          view="angle"
        />
      </div>
      <div>
        <p>
          Drag to move; scroll or pinch to resize the artwork. Changes here apply only to{' '}
          {phone.name}.
        </p>
        <canvas
          ref={setCanvas}
          aria-label={`Artwork placement for ${phone.name}`}
          className="cw-flat"
          width={t.width}
          height={t.height}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            drag.current = { x: e.clientX, y: e.clientY, p: placement }
          }}
          onPointerMove={(e) => {
            if (!drag.current) return
            const r = e.currentTarget.getBoundingClientRect()
            const d = drag.current
            onChange({
              ...d.p,
              x: Math.max(
                -t.width,
                Math.min(t.width * 2, d.p.x + ((e.clientX - d.x) * t.width) / r.width),
              ),
              y: Math.max(
                -t.height,
                Math.min(t.height * 2, d.p.y + ((e.clientY - d.y) * t.height) / r.height),
              ),
            })
          }}
          onPointerUp={() => {
            drag.current = null
          }}
          onPointerCancel={() => {
            drag.current = null
          }}
        />
        <label>
          Artwork size
          <input
            aria-label="Model artwork size"
            type="range"
            min={20}
            max={t.width * 4}
            value={placement.width}
            onChange={(e) => onChange({ ...placement, width: Number(e.target.value) })}
          />
        </label>
        <label>
          Rotation
          <input
            aria-label="Model artwork rotation"
            type="range"
            min={-180}
            max={180}
            value={placement.rotation}
            onChange={(e) => onChange({ ...placement, rotation: Number(e.target.value) })}
          />
        </label>
        <button type="button" onClick={onReset}>
          Use shared placement
        </button>
      </div>
    </div>
  )
}
