import sharp from 'sharp'
import fs from 'node:fs/promises'

// Preserve aspect ratio; the tiny crop reconciles the generated portrait with
// the existing UV rectangle. No stretching, gradient, or artwork retouching.
await fs.mkdir('pipeline/designs', { recursive: true })
await fs.mkdir('public/designs', { recursive: true })
for (const slug of ['meridian', 'static-bloom', 'low-tide']) {
  await sharp(`pipeline/artwork/source/${slug}.png`)
    .resize(1070, 1910, { fit: 'cover' })
    .png()
    .toFile(`pipeline/designs/${slug}.png`)
  await sharp(`pipeline/designs/${slug}.png`)
    .resize(856)
    .webp({ quality: 88 })
    .toFile(`public/designs/${slug}.webp`)
}
