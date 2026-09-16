import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import sharp from 'sharp'
import { readJob, writeJob, jobDirectory } from '../../src/lib/studio-publish/jobs'
import { artworkSVG, template } from '../../src/lib/studio-publish/placement'
const id = process.argv[2]
const job = await readJob(id)
const dir = jobDirectory(id)
const blender = process.env.BLENDER_PATH || '/Applications/Blender.app/Contents/MacOS/Blender'
async function run(args: string[]) {
  const log = await fs.open(path.join(dir, 'render.log'), 'a')
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(blender, args, { cwd: process.cwd(), stdio: ['ignore', log.fd, log.fd] })
      child.once('error', reject)
      child.once('exit', (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Blender could not render this model (exit ${code}).`)),
      )
    })
  } finally {
    await log.close()
  }
}
try {
  job.pid = process.pid
  job.status = 'rendering'
  await writeJob(job)
  const original = await fs.readFile(path.join(dir, job.original))
  // Match browser EXIF orientation without modifying the private original.
  const prepared = await sharp(original).rotate().png().toBuffer({ resolveWithObject: true })
  const source = `data:image/png;base64,${prepared.data.toString('base64')}`
  await sharp(prepared.data)
    .resize({ width: 1400, height: 1800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(path.join(dir, 'artwork.webp'))
  for (const model of job.models) {
    const out = path.join(dir, model.slug)
    await fs.mkdir(out, { recursive: true })
    const svg = artworkSVG(
      model.params,
      model.placement,
      source,
      prepared.info.width / prepared.info.height,
    )
    const composite = artworkSVG(
      model.params,
      model.placement,
      source,
      prepared.info.width / prepared.info.height,
      true,
    )
    const texture = path.join(out, 'texture.png')
    await sharp(Buffer.from(composite)).png().toFile(texture)
    await sharp(Buffer.from(composite)).webp({ quality: 92 }).toFile(path.join(out, 'texture.webp'))
    const bounds = template(model.params).flat
    let print = sharp(Buffer.from(svg))
    if (model.placement.printMode === 'back')
      print = print.extract({
        left: Math.round(bounds.x),
        top: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      })
    await print.png().toFile(path.join(out, 'print.png'))
    // Cache reuse requires the exact reviewed geometry version, not only a phone name.
    let blend = path.join(process.cwd(), 'pipeline/out/storefront', model.slug, 'shell.blend')
    const cacheParams = path.join(
      process.cwd(),
      'pipeline/out/storefront',
      model.slug,
      'params.json',
    )
    const cached = await fs.readFile(cacheParams, 'utf8').catch(() => null)
    if (
      !cached ||
      JSON.stringify(JSON.parse(cached)) !== JSON.stringify(model.params) ||
      !(await fs.stat(blend).catch(() => null))
    ) {
      const params = path.join(out, 'params.json')
      await fs.writeFile(params, JSON.stringify(model.params))
      blend = path.join(out, 'shell.blend')
      await run([
        '-b',
        '--python-exit-code',
        '1',
        '-P',
        'pipeline/blender/build_shell.py',
        '--',
        '--params',
        params,
        '--texture',
        texture,
        '--out',
        blend,
      ])
    }
    await run([
      '-b',
      blend,
      '--python-exit-code',
      '1',
      '-P',
      'pipeline/blender/render_studio.py',
      '--',
      '--texture',
      texture,
      '--out',
      out,
      '--silicone',
      model.placement.silicone,
    ])
    for (const view of ['hero', 'three_quarter', 'flat', 'detail'])
      await sharp(path.join(out, view + '.png'))
        .webp({ quality: 90 })
        .toFile(path.join(out, view + '.webp'))
    job.completed++
    await writeJob(job)
  }
  job.status = 'ready'
  await writeJob(job)
} catch (error) {
  job.status = 'failed'
  job.error = error instanceof Error ? error.message : 'Could not generate previews.'
  await writeJob(job)
  process.exitCode = 1
}
