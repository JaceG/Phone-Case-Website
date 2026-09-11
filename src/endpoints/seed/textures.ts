import type { File } from 'payload'
import sharp from 'sharp'

/**
 * Generated test textures for pipeline validation and seeding.
 *
 * A numbered UV checker reveals stretching and misalignment immediately where
 * real artwork hides it. These are also the only images we ever seed: no
 * borrowed art, nothing to license, nothing that shapes the layout.
 */

type CheckerArgs = {
  /** File name without extension */
  name: string
  /** Print-face aspect. Defaults to roughly a 6.3" case, 2:1 portrait. */
  width?: number
  height?: number
  cols?: number
  rows?: number
  /** Base hue in degrees; alternate cells are offset from it. */
  hue?: number
  /** Optional caption drawn along the top edge. */
  caption?: string
}

const hsl = (h: number, s: number, l: number) => `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`

const columnLabel = (i: number) => String.fromCharCode(65 + (i % 26))

export const uvCheckerSVG = ({
  width = 1200,
  height = 2400,
  cols = 8,
  rows = 16,
  hue = 210,
  caption,
}: Omit<CheckerArgs, 'name'>): string => {
  const cw = width / cols
  const ch = height / rows
  const cells: string[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dark = (r + c) % 2 === 0
      const fill = dark ? hsl(hue, 45, 22) : hsl(hue + 30, 55, 62)
      const text = dark ? hsl(hue + 30, 55, 80) : hsl(hue, 45, 14)
      const x = c * cw
      const y = r * ch
      cells.push(
        `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${fill}"/>`,
        `<text x="${x + cw / 2}" y="${y + ch / 2}" fill="${text}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(Math.min(cw, ch) * 0.28)}" font-weight="700" text-anchor="middle" dominant-baseline="central">${columnLabel(c)}${r + 1}</text>`,
      )
    }
  }

  const stroke = hsl(hue + 180, 80, 55)
  const guides = [
    // Centre crosshair
    `<line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}" stroke="${stroke}" stroke-width="3"/>`,
    `<line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" stroke="${stroke}" stroke-width="3"/>`,
    // Edge-alignment frame: if this isn't flush with the case edge, the UV is off
    `<rect x="6" y="6" width="${width - 12}" height="${height - 12}" fill="none" stroke="${stroke}" stroke-width="12"/>`,
    // Corner markers
    ...[
      [0, 0],
      [width, 0],
      [0, height],
      [width, height],
    ].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${Math.round(cw * 0.35)}" fill="${stroke}"/>`),
  ]

  const captionEl = caption
    ? `<text x="${width / 2}" y="${Math.round(ch * 0.55)}" fill="#fff" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(ch * 0.4)}" font-weight="700" text-anchor="middle" dominant-baseline="central" style="paint-order:stroke" stroke="#000" stroke-width="6">${caption}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${cells.join('')}${guides.join('')}${captionEl}</svg>`
}

export const uvCheckerPNG = async (args: CheckerArgs): Promise<File> => {
  const svg = uvCheckerSVG(args)
  const data = await sharp(Buffer.from(svg)).png().toBuffer()

  return {
    name: `${args.name}.png`,
    data,
    mimetype: 'image/png',
    size: data.byteLength,
  }
}

/**
 * A near-black gradient with grain, in the cinematic kit's register. Stand-in
 * for hero/environment imagery until real renders exist.
 */
export const darkHeroPNG = async ({
  name,
  width = 1920,
  height = 1080,
  hue = 220,
}: {
  name: string
  width?: number
  height?: number
  hue?: number
}): Promise<File> => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <radialGradient id="g" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stop-color="${hsl(hue, 30, 22)}"/>
        <stop offset="60%" stop-color="${hsl(hue, 25, 7)}"/>
        <stop offset="100%" stop-color="#050505"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`

  const base = sharp(Buffer.from(svg))
  const noise = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
      noise: { type: 'gaussian', mean: 128, sigma: 12 },
    },
  })
    .png()
    .toBuffer()

  const data = await base
    .composite([{ input: noise, blend: 'soft-light' }])
    .png()
    .toBuffer()

  return {
    name: `${name}.png`,
    data,
    mimetype: 'image/png',
    size: data.byteLength,
  }
}
