import { MODEL, type Placement } from '@/components/case-studio/artwork'
import type { Geometry } from './types'
export function template(g: Geometry) {
  const px = g.template_px_per_mm
  const x = g.depth_mm * px,
    y = x,
    w = g.width_mm * px,
    h = g.height_mm * px
  const roll = g.back_roll_mm * px
  return {
    width: Math.round(w + 2 * x),
    height: Math.round(h + 2 * y),
    px,
    back: { x, y, width: w, height: h },
    flat: {
      x: x + roll,
      y: y + roll,
      width: w - 2 * roll,
      height: h - 2 * roll,
      radius: Math.max(0, (g.corner_radius_mm - g.back_roll_mm) * px),
    },
    holes: g.holes.map((hole) => ({
      x: x + (g.camera_island.x_mm + hole.x_mm) * px,
      y: y + (g.camera_island.y_mm + hole.y_mm) * px,
      radius: (hole.d_mm * px) / 2,
    })),
  }
}
export function adaptPlacement(p: Placement, g: Geometry): Placement {
  const a = template(MODEL),
    b = template(g)
  return {
    ...p,
    x: b.back.x + ((p.x - a.back.x) / a.back.width) * b.back.width,
    y: b.back.y + ((p.y - a.back.y) / a.back.height) * b.back.height,
    width: p.width * Math.min(b.back.width / a.back.width, b.back.height / a.back.height),
  }
}
export function validatePlacement(value: unknown, g: Geometry): Placement {
  const p = value as Placement
  const t = template(g)
  if (
    !p ||
    !['wrap', 'back'].includes(p.printMode) ||
    !/^#[\da-f]{6}$/i.test(p.background) ||
    !/^#[\da-f]{6}$/i.test(p.silicone) ||
    !Number.isFinite(p.x) ||
    p.x < -t.width ||
    p.x > t.width * 2 ||
    !Number.isFinite(p.y) ||
    p.y < -t.height ||
    p.y > t.height * 2 ||
    !Number.isFinite(p.width) ||
    p.width < 20 ||
    p.width > t.width * 4 ||
    !Number.isFinite(p.rotation) ||
    Math.abs(p.rotation) > 180
  )
    throw new Error('Check the artwork placement for each selected phone.')
  return {
    x: p.x,
    y: p.y,
    width: p.width,
    rotation: p.rotation,
    background: p.background,
    silicone: p.silicone,
    printMode: p.printMode,
  }
}
/** Both the browser preview and server exports rasterize this exact SVG. */
export function artworkSVG(
  g: Geometry,
  p: Placement,
  source: string,
  aspect: number,
  composite = false,
) {
  const t = template(g),
    b = t.flat
  if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(source))
    throw new Error('Invalid artwork image.')
  const mask = `<mask id="print" maskUnits="userSpaceOnUse" x="0" y="0" width="${t.width}" height="${t.height}"><rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${b.radius}" fill="white"/>${t.holes.map((h) => `<circle cx="${h.x}" cy="${h.y}" r="${h.radius}" fill="black"/>`).join('')}</mask>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${t.width}" height="${t.height}" viewBox="0 0 ${t.width} ${t.height}"><defs>${mask}</defs>${composite ? `<rect width="100%" height="100%" fill="${p.silicone}"/>` : ''}<g ${p.printMode === 'back' ? 'mask="url(#print)"' : ''}><rect width="100%" height="100%" fill="${p.background}"/><image href="${source}" x="${-p.width / 2}" y="${-p.width / aspect / 2}" width="${p.width}" height="${p.width / aspect}" transform="translate(${p.x} ${p.y}) rotate(${p.rotation})"/></g></svg>`
}
