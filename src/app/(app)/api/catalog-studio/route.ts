import { studioAuth } from '@/lib/studio/auth'
import { documentOf, geometryVersion, saveStudio, StudioError } from '@/lib/studio/save'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function GET(request: Request) {
  const auth = await studioAuth(request.headers)
  if (!auth) return json({ error: 'Sign in as an administrator to use Catalog Studio.' }, 403)
  const { payload, req } = auth
  const current = await geometryVersion()
  const id = new URL(request.url).searchParams.get('revision')
  if (id !== null) {
    if (!/^[1-9]\d*$/.test(id)) return json({ error: 'Invalid revision.' }, 400)
    try {
      const doc = await payload.findByID({
        collection: 'studioRevisions',
        id: Number(id),
        req,
        depth: 1,
        overrideAccess: false,
      })
      return json(documentOf(doc, current))
    } catch {
      return json({ error: 'Saved revision not found.' }, 404)
    }
  }
  const [revisions, collections] = await Promise.all([
    payload.find({
      collection: 'studioRevisions',
      req,
      overrideAccess: false,
      depth: 1,
      pagination: false,
      sort: '-createdAt',
    }),
    payload.find({
      collection: 'categories',
      req,
      overrideAccess: false,
      depth: 0,
      pagination: false,
      sort: 'title',
    }),
  ])
  const seen = new Set<string>()
  return json({
    geometryVersion: current,
    collections: collections.docs.map((c) => ({ id: c.id, title: c.title })),
    drafts: revisions.docs
      .filter((doc) => {
        if (seen.has(doc.lineage)) return false
        seen.add(doc.lineage)
        return true
      })
      .map((doc) => documentOf(doc, current)),
  })
}

export async function POST(request: Request) {
  const auth = await studioAuth(request.headers)
  if (!auth) return json({ error: 'Sign in as an administrator to save a draft.' }, 403)
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin)
    return json({ error: 'Save from the same site as Catalog Studio.' }, 403)
  try {
    // Bound the actual body, not merely the client-supplied Content-Length.
    const reader = request.body?.getReader()
    if (!reader) throw new StudioError('Missing upload.')
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > 48 * 1024 * 1024) {
        await reader.cancel()
        throw new StudioError('This upload is too large.', 413)
      }
      chunks.push(value)
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { 'Content-Type': request.headers.get('content-type') ?? '' },
    }).formData()
    return json(await saveStudio(form, auth.req), 201)
  } catch (error) {
    if (error instanceof StudioError) return json({ error: error.message }, error.status)
    auth.payload.logger.error({ err: error, msg: 'Catalog Studio save failed' })
    return json(
      { error: 'Could not save this draft. Check the image and fields, then try again.' },
      400,
    )
  }
}
