import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { parseProject } from '@/components/case-studio/artwork'

export const runtime = 'nodejs'
const directory = path.join(process.cwd(), 'placeholder/case-studio/exports')
const deletedDirectory = path.join(directory, '.deleted')
const validName = /^[a-f0-9-]{36}_[a-z0-9-]+\.(?:png|case-studio\.json)$/
const describe = (file: string) => ({
  file,
  name: file.slice(37),
  url: `/case-studio/files?file=${encodeURIComponent(file)}`,
  project: file.endsWith('.json'),
})

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 })
  const file = new URL(request.url).searchParams.get('file')
  const listDirectory =
    new URL(request.url).searchParams.get('deleted') === '1' ? deletedDirectory : directory
  try {
    if (file !== null) {
      if (!validName.test(file)) return new Response(null, { status: 404 })
      const data = await fs.readFile(path.join(directory, file))
      return new Response(new Uint8Array(data), {
        headers: {
          'Content-Type': file.endsWith('.png') ? 'image/png' : 'application/json',
          'Cache-Control': 'no-store',
          'Content-Disposition': `inline; filename="${file.slice(37)}"`,
        },
      })
    }
    const files = await fs.readdir(listDirectory)
    const items = await Promise.all(
      files
        .filter((file) => validName.test(file))
        .map(async (file) => ({
          ...describe(file),
          savedAt: (await fs.stat(path.join(listDirectory, file))).mtimeMs,
        })),
    )
    return Response.json(
      items.sort((a, b) => b.savedAt - a.savedAt),
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return file ? new Response(null, { status: 404 }) : Response.json([])
    throw error
  }
}

/** Deletion is recoverable: only move a validated local export into its trash folder. */
async function moveSavedFile(request: Request, restore: boolean) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 })
  const url = new URL(request.url)
  const origin = request.headers.get('origin')
  if (origin && origin !== url.origin) return new Response(null, { status: 403 })
  const file = url.searchParams.get('file')
  if (!file || !validName.test(file)) return new Response(null, { status: 404 })
  const from = restore ? deletedDirectory : directory
  const to = restore ? directory : deletedDirectory
  try {
    await fs.mkdir(to, { recursive: true })
    // Exclusive copy prevents a repeated/concurrent request from overwriting a saved copy.
    await fs.copyFile(path.join(from, file), path.join(to, file), fs.constants.COPYFILE_EXCL)
    await fs.unlink(path.join(from, file))
    return Response.json(describe(file), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT')
      return new Response('This file is no longer here. Refresh the list.', { status: 404 })
    if (code === 'EEXIST')
      return new Response('This file has already been moved. Refresh the list.', { status: 409 })
    return new Response('The file could not be moved. Please try again.', { status: 500 })
  }
}

export async function DELETE(request: Request) {
  return moveSavedFile(request, false)
}
export async function PATCH(request: Request) {
  return moveSavedFile(request, true)
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 })
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 })
  if (Number(request.headers.get('content-length')) > 42 * 1024 * 1024)
    return new Response('File is too large.', { status: 413 })
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (
      !(file instanceof File) ||
      file.size > 41 * 1024 * 1024 ||
      !/^[a-z0-9-]+\.(?:png|case-studio\.json)$/.test(file.name)
    ) {
      return new Response('Choose an image or Case Studio project.', { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    if (file.name.endsWith('.json')) parseProject(JSON.parse(buffer.toString('utf8')))
    else if (!buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      return new Response('Invalid PNG image.', { status: 400 })
    }
    const stored = `${randomUUID()}_${file.name}`
    await fs.mkdir(directory, { recursive: true })
    await fs.writeFile(path.join(directory, stored), buffer, { flag: 'wx' })
    return Response.json(describe(stored), { status: 201 })
  } catch {
    return new Response('The file could not be saved. Please try again.', { status: 400 })
  }
}
