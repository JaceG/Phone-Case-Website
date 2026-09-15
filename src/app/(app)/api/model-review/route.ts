import { studioAuth } from '@/lib/studio/auth'
import { listReviews, queueModels, ReviewError, saveDecision } from '@/lib/model-review/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function GET(request: Request) {
  const auth = await studioAuth(request.headers)
  if (!auth) return json({ error: 'Sign in as an administrator.' }, 403)
  return json(await listReviews(auth.req))
}
export async function POST(request: Request) {
  const auth = await studioAuth(request.headers)
  if (!auth) return json({ error: 'Sign in as an administrator.' }, 403)
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Use the review page on this site.' }, 403)
  try {
    const reader = request.body?.getReader()
    if (!reader) throw new ReviewError('Missing request.')
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > 64000) {
        await reader.cancel()
        throw new ReviewError('Request too large.', 413)
      }
      chunks.push(value)
    }
    const input = JSON.parse(Buffer.concat(chunks).toString())
    if (!input || typeof input !== 'object') throw new ReviewError('Invalid request.')
    if (input.action === 'queue') return json(await queueModels(input, auth.req), 201)
    if (input.action === 'decision') return json(await saveDecision(input, auth.req))
    throw new ReviewError('Unknown action.')
  } catch (error) {
    if (error instanceof ReviewError) return json({ error: error.message }, error.status)
    auth.payload.logger.error({ err: error, msg: 'Model review failed' })
    return json({ error: 'Could not save. Refresh the page and try again.' }, 400)
  }
}
