import fs from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

// Borrowed artwork stays in the ignored placeholder folder and is available
// only to the local development preview, never a production/staging build.
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 })
  const { file } = await params
  if (
    !/^[a-z0-9-]+_(?:hero|three_quarter|flat|detail|interior|turntable_\d{3}|tumble_\d{3})\.(?:png|webp)$/.test(
      file,
    )
  ) {
    return new Response(null, { status: 404 })
  }
  try {
    const data = await fs.readFile(
      path.join(process.cwd(), 'placeholder', 'artwork-preview', 'renders', file),
    )
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': file.endsWith('.webp') ? 'image/webp' : 'image/png',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return new Response(null, { status: 404 })
    throw error
  }
}
