'use client'

import { useEffect, useRef } from 'react'
import type { PointerEvent, Ref } from 'react'
import { Minus, Plus } from 'lucide-react'
import { MODEL, type Placement, type PrintMode } from './artwork'
import { template } from '@/lib/studio-publish/placement'
import type { Geometry } from '@/lib/studio-publish/types'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function TemplateGuides({ mode, geometry }: { mode: PrintMode; geometry: Geometry }) {
  const { width: WIDTH, height: HEIGHT, back: BACK, flat: FLAT_BACK, holes } = template(geometry)
  const PX = geometry.template_px_per_mm
  const c = geometry.camera_island
  const CAMERA = {
    x: BACK.x + c.x_mm * PX,
    y: BACK.y + c.y_mm * PX,
    width: c.w_mm * PX,
    height: c.h_mm * PX,
    radius: c.corner_radius_mm * PX,
  }
  const back = mode === 'back' ? FLAT_BACK : { ...BACK, radius: geometry.corner_radius_mm * PX }
  return (
    <svg className="cs-guides" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
      <rect x={back.x} y={back.y} width={back.width} height={back.height} rx={back.radius} />
      <rect
        x={CAMERA.x}
        y={CAMERA.y}
        width={CAMERA.width}
        height={CAMERA.height}
        rx={CAMERA.radius}
        className="cs-camera-guide"
      />
      {holes.map((h, index) => (
        <circle key={index} cx={h.x} cy={h.y} r={h.radius} />
      ))}
    </svg>
  )
}

export default function FlatLayoutEditor({
  canvasRef,
  geometry = MODEL,
  placement,
  hasImage,
  onChange,
}: {
  geometry?: Geometry
  canvasRef: Ref<HTMLCanvasElement>
  placement: Placement
  hasImage: boolean
  onChange: (patch: Partial<Placement>) => void
}) {
  const { width: WIDTH, height: HEIGHT, back: BACK } = template(geometry)
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef({ placement, hasImage, onChange })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{
    x: number
    y: number
    startX: number
    startY: number
    ratio: number
  } | null>(null)
  const pinch = useRef<{ distance: number; width: number } | null>(null)
  const zoomPercent = (placement.width / BACK.width) * 100

  useEffect(() => {
    latest.current = { placement, hasImage, onChange }
  }, [placement, hasImage, onChange])

  function setArtworkWidth(width: number) {
    const current = latest.current
    if (!current.hasImage) return
    const nextWidth = clamp(width, 20, WIDTH * 4)
    // Wheel events can arrive faster than React paints. Accumulate from the
    // latest width so a fast scroll remains smooth without dropping steps.
    latest.current = { ...current, placement: { ...current.placement, width: nextWidth } }
    current.onChange({ width: nextWidth })
  }

  function zoomArtwork(factor: number) {
    setArtworkWidth(latest.current.placement.width * factor)
  }

  useEffect(() => {
    const node = host.current
    if (!node) return
    const wheel = (event: WheelEvent) => {
      if (!latest.current.hasImage) return
      event.preventDefault()
      drag.current = null
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1
      const delta = clamp(event.deltaY * units, -150, 150)
      zoomArtwork(Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.003)))
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return () => node.removeEventListener('wheel', wheel)
  }, [WIDTH, HEIGHT])

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !hasImage) return
    event.preventDefault()
    const node = event.currentTarget
    node.focus({ preventScroll: true })
    node.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = {
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        width: latest.current.placement.width,
      }
      drag.current = null
      return
    }
    if (pointers.current.size > 2) return
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      x: placement.x,
      y: placement.y,
      ratio: WIDTH / node.getBoundingClientRect().width,
    }
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const gesture = pinch.current
    if (gesture && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      setArtworkWidth((gesture.width * Math.hypot(a.x - b.x, a.y - b.y)) / gesture.distance)
      return
    }
    const d = drag.current
    if (!d) return
    onChange({
      x: clamp(d.x + (event.clientX - d.startX) * d.ratio, -WIDTH, WIDTH * 2),
      y: clamp(d.y + (event.clientY - d.startY) * d.ratio, -HEIGHT, HEIGHT * 2),
    })
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
    pinch.current = null
    drag.current = null
  }

  return (
    <>
      <div className="cs-layout-tools cs-artwork-zoom">
        <div className="cs-zoom-row">
          <span>
            Artwork zoom <output>{Math.round(zoomPercent)}%</output>
          </span>
          <div>
            <button
              aria-label="Zoom artwork out"
              title="Make the image smaller on the case"
              disabled={!hasImage || placement.width <= 20}
              onClick={() => zoomArtwork(1 / 1.1)}
            >
              <Minus size={15} />
            </button>
            <button
              aria-label="Zoom artwork in"
              title="Make the image larger on the case"
              disabled={!hasImage || placement.width >= WIDTH * 4}
              onClick={() => zoomArtwork(1.1)}
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
        <input
          type="range"
          aria-label="Artwork zoom"
          aria-valuetext={`${Math.round(zoomPercent)} percent`}
          min={Math.floor((20 / BACK.width) * 1000) / 10}
          max={Math.ceil(((WIDTH * 4) / BACK.width) * 1000) / 10}
          step={0.1}
          value={zoomPercent}
          disabled={!hasImage}
          onChange={(event) => setArtworkWidth((Number(event.target.value) * BACK.width) / 100)}
        />
        <p className="cs-zoom-help">Changes the image size on your case.</p>
      </div>
      <div
        ref={host}
        className="cs-template"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        tabIndex={0}
        role="group"
        aria-label="Artwork placement. Drag to move. Scroll, pinch, or use plus and minus to resize the image on the case. Arrow keys move the image; hold Shift for larger steps."
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={stopDrag}
        onKeyDown={(event) => {
          if (event.key === '+' || event.key === '=' || event.key === '-') {
            event.preventDefault()
            zoomArtwork(event.key === '-' ? 1 / 1.1 : 1.1)
            return
          }
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          }
          const direction = moves[event.key]
          if (!direction || !hasImage) return
          event.preventDefault()
          const step = event.shiftKey ? 10 : 1
          onChange({
            x: clamp(placement.x + direction[0] * step, -WIDTH, WIDTH * 2),
            y: clamp(placement.y + direction[1] * step, -HEIGHT, HEIGHT * 2),
          })
        }}
      >
        <div className="cs-template-surface">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            aria-label={
              placement.printMode === 'back'
                ? 'Back-only artwork; checkerboard areas are unprinted'
                : 'Wraparound artwork with edge bleed'
            }
          />
          <TemplateGuides mode={placement.printMode} geometry={geometry} />
        </div>
      </div>
      <p className="cs-zoom-help">
        Drag to move. Scroll or pinch here to zoom the artwork on the case.
      </p>
    </>
  )
}
