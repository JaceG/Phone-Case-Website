/**
 * Write a numbered UV checker PNG for pipeline validation.
 *
 *   pnpm tsx pipeline/scripts/uv-checker.ts [out.png] [width] [height] [hue] [caption]
 *
 * Defaults to pipeline/designs/uv-checker.png at the iPhone 17 Pro Max print
 * template size, 1070×1910 (10 px/mm of (81 + 2·13) × (165 + 2·13) mm — see
 * pipeline/README.md "UV map ↔ print template"). Pass an explicit size for
 * other blanks; the aspect must be (width + 2·depth) : (height + 2·depth).
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import { uvCheckerPNG } from '../../src/endpoints/seed/textures'

const [outArg, widthArg, heightArg, hueArg, captionArg] = process.argv.slice(2)
const out = outArg ?? path.join('pipeline', 'designs', 'uv-checker.png')
const width = widthArg ? Number(widthArg) : 1070
const height = heightArg ? Number(heightArg) : 1910
const hue = hueArg ? Number(hueArg) : 210

const file = await uvCheckerPNG({
  name: path.basename(out, '.png'),
  width,
  height,
  hue,
  caption: captionArg ?? `${width}×${height}`,
})

await fs.mkdir(path.dirname(out), { recursive: true })
await fs.writeFile(out, file.data as Buffer)
console.log(`wrote ${out} (${width}×${height}, hue ${hue})`)
