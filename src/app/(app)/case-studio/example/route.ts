import fs from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 })
  try {
    const source = await fs.readFile(
      path.join(process.cwd(), 'placeholder/artwork-preview/source/Gohan.jpg'),
    )
    return new Response(new Uint8Array(source), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return new Response(null, { status: 404 })
    throw error
  }
}
