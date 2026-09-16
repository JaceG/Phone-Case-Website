import fs from 'node:fs/promises'
import path from 'node:path'
import { studioAuth } from '@/lib/studio/auth'
import { StudioError } from '@/lib/studio/save'
import { approvedPhones, createRenderJob, publishJob } from '@/lib/studio-publish/server'
import { jobDirectory, latestJob, readJob } from '@/lib/studio-publish/jobs'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function GET(request: Request) {
  const auth = await studioAuth(request.headers)
  if (!auth) return json({ error: 'Sign in to Catalog Studio.' }, 403)
  try {
    const q = new URL(request.url).searchParams
    if (q.has('job')) {
      const job = await readJob(q.get('job')!)
      if (q.has('image')) {
        const view = q.get('image')!,
          slug = q.get('model')!
        const artwork = slug === 'artwork' && view === 'artwork'
        if (
          !artwork &&
          (!job.models.some((m) => m.slug === slug) ||
            !['hero', 'three_quarter', 'flat', 'detail', 'texture', 'print'].includes(view))
        )
          return json({ error: 'Image not found.' }, 404)
        const ext = view === 'print' ? 'png' : 'webp'
        const file = artwork ? 'artwork.webp' : `${slug}/${view}.${ext}`
        return new Response(
          new Uint8Array(await fs.readFile(path.join(jobDirectory(job.id), file))),
          { headers: { 'Content-Type': `image/${ext}`, 'Cache-Control': 'private, no-store' } },
        )
      }
      const current = await latestJob(job.revision)
      return json(current?.id === job.id ? current : job)
    }
    const revision = Number(q.get('revision'))
    return json({
      models: await approvedPhones(auth.req),
      job: Number.isSafeInteger(revision) && revision > 0 ? await latestJob(revision) : null,
    })
  } catch {
    return json({ error: 'Preview not found.' }, 404)
  }
}
export async function POST(request: Request) {
  const auth = await studioAuth(request.headers)
  if (!auth) return json({ error: 'Sign in to Catalog Studio.' }, 403)
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Use Catalog Studio on this site.' }, 403)
  try {
    const text = await request.text()
    if (text.length > 100000) throw new StudioError('Too many placement settings.')
    const input = JSON.parse(text)
    return json(
      input.action === 'publish'
        ? await publishJob(await readJob(input.job), auth.req)
        : await createRenderJob(input, auth.req),
    )
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Could not update the catalog.' },
      error instanceof StudioError ? error.status : 400,
    )
  }
}
