import params from '../../../pipeline/blender/params/iphone-17-pro-max.json'

// These are the very same coordinates used by Blender, including edge bleed.
export const MODEL = params
export const PX = params.template_px_per_mm
export const WIDTH = (params.width_mm + 2 * params.depth_mm) * PX
export const HEIGHT = (params.height_mm + 2 * params.depth_mm) * PX
export const BACK = {
  x: params.depth_mm * PX,
  y: params.depth_mm * PX,
  width: params.width_mm * PX,
  height: params.height_mm * PX,
}

// The flat face stops where the shell's rolled shoulder begins. This is a
// preview mask derived from the model, pending the supplier's insert dieline.
const shoulder = params.back_roll_mm * PX
export const FLAT_BACK = {
  x: BACK.x + shoulder,
  y: BACK.y + shoulder,
  width: BACK.width - 2 * shoulder,
  height: BACK.height - 2 * shoulder,
  radius: (params.corner_radius_mm - params.back_roll_mm) * PX,
}
const c = params.camera_island
export const CAMERA = {
  x: BACK.x + c.x_mm * PX,
  y: BACK.y + c.y_mm * PX,
  width: c.w_mm * PX,
  height: c.h_mm * PX,
  radius: c.corner_radius_mm * PX,
}
export type PrintMode = 'wrap' | 'back'

export function exportBounds(mode: PrintMode) {
  return mode === 'back' ? FLAT_BACK : { x: 0, y: 0, width: WIDTH, height: HEIGHT }
}

export type Placement = {
  x: number
  y: number
  width: number
  rotation: number
  background: string
  silicone: string
  printMode: PrintMode
}

export const DEFAULT: Placement = {
  x: WIDTH / 2,
  y: HEIGHT / 2,
  width: BACK.width,
  rotation: 0,
  background: '#171719',
  silicone: '#171719',
  printMode: 'wrap',
}

export function fitPlacement(
  image: { width: number; height: number },
  mode: 'portrait' | 'fill',
  printMode: PrintMode = 'wrap',
) {
  const aspect = image.width / image.height
  const back = printMode === 'back' ? FLAT_BACK : BACK
  const bounds = exportBounds(printMode)
  const height = back.height * 0.7
  return mode === 'portrait'
    ? { x: WIDTH / 2, y: back.y + back.height - height / 2, width: height * aspect, rotation: 0 }
    : {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        width: Math.max(bounds.width, bounds.height * aspect),
        rotation: 0,
      }
}

export function drawArtwork(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
  p: Placement,
) {
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  ctx.save()
  if (p.printMode === 'back') {
    const mask = new Path2D()
    mask.roundRect(FLAT_BACK.x, FLAT_BACK.y, FLAT_BACK.width, FLAT_BACK.height, FLAT_BACK.radius)
    // The camera deck is printable too. Only the actual lens, flash and
    // sensor openings are excluded, not the entire raised surround.
    for (const hole of MODEL.holes) {
      const x = CAMERA.x + hole.x_mm * PX
      const y = CAMERA.y + hole.y_mm * PX
      const radius = (hole.d_mm * PX) / 2
      mask.moveTo(x + radius, y)
      mask.arc(x, y, radius, 0, Math.PI * 2)
      mask.closePath()
    }
    ctx.clip(mask, 'evenodd')
  }
  ctx.fillStyle = p.background
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  if (image) {
    const height = (p.width * image.naturalHeight) / image.naturalWidth
    ctx.translate(p.x, p.y)
    ctx.rotate((p.rotation * Math.PI) / 180)
    ctx.drawImage(image, -p.width / 2, -height / 2, p.width, height)
  }
  ctx.restore()
}

export function createPrintExport(canvas: HTMLCanvasElement, mode: PrintMode) {
  const b = exportBounds(mode)
  const output = document.createElement('canvas')
  output.width = b.width
  output.height = b.height
  output.getContext('2d')!.drawImage(canvas, b.x, b.y, b.width, b.height, 0, 0, b.width, b.height)
  return output
}

export function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () =>
      reject(new Error('This image could not be opened. Try a PNG, JPG, or WebP.'))
    img.src = source
  })
}

export function readFile(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read this file.'))
    reader.readAsDataURL(file)
  })
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function parseProject(input: unknown): {
  image: string
  name: string
  placement: Placement
} {
  const value = input as Record<string, unknown> | null
  if (
    !value ||
    value.version !== 1 ||
    value.model !== MODEL.slug ||
    typeof value.image !== 'string' ||
    !/^data:image\/(png|jpeg|webp);base64,/.test(value.image) ||
    typeof value.name !== 'string'
  ) {
    throw new Error('Choose a Case Studio project saved for this phone model.')
  }
  const p = value.placement as Placement
  const bounds = {
    x: [-WIDTH, WIDTH * 2],
    y: [-HEIGHT, HEIGHT * 2],
    width: [20, WIDTH * 4],
    rotation: [-180, 180],
  }
  if (
    !p ||
    (p.printMode !== undefined && p.printMode !== 'wrap' && p.printMode !== 'back') ||
    !/^#[\da-f]{6}$/i.test(p.background) ||
    !/^#[\da-f]{6}$/i.test(p.silicone) ||
    Object.entries(bounds).some(([key, [min, max]]) => {
      const n = p[key as keyof typeof bounds]
      return !Number.isFinite(n) || n < min || n > max
    })
  )
    throw new Error('This project has invalid placement settings.')
  // Older projects may include a fade. Ignore that obsolete effect while
  // retaining the image, placement, and colors exactly as they were saved.
  return {
    image: value.image,
    name: value.name.slice(0, 150),
    placement: {
      x: p.x,
      y: p.y,
      width: p.width,
      rotation: p.rotation,
      background: p.background,
      silicone: p.silicone,
      printMode: p.printMode ?? 'wrap',
    },
  }
}
