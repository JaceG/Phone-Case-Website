// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

let temp: string
let routes: typeof import('@/app/(app)/case-studio/files/route')
const file = '11111111-1111-4111-8111-111111111111_saved-project.case-studio.json'
const request = (method: string, name = file, origin = 'http://localhost:3000') =>
  new Request(`http://localhost:3000/case-studio/files?file=${encodeURIComponent(name)}`, {
    method,
    headers: { origin },
  })

beforeAll(async () => {
  temp = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-files-'))
  vi.spyOn(process, 'cwd').mockReturnValue(temp)
  vi.stubEnv('NODE_ENV', 'development')
  routes = await import('@/app/(app)/case-studio/files/route')
})
afterAll(async () => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  await fs.rm(temp, { recursive: true, force: true })
})

describe('local saved-file deletion', () => {
  it('removes only the selected file, persists recovery, and restores identical bytes', async () => {
    const directory = path.join(temp, 'placeholder/case-studio/exports')
    await fs.mkdir(directory, { recursive: true })
    const original = Buffer.from('{"source":"original artwork","placement":{"width":107.7}}')
    await fs.writeFile(path.join(directory, file), original)
    const other = file.replace('saved-project', 'another-project')
    await fs.writeFile(path.join(directory, other), original)
    expect((await routes.DELETE(request('DELETE'))).status).toBe(200)
    expect((await routes.GET(request('GET'))).status).toBe(404)
    const list = await (
      await routes.GET(new Request('http://localhost:3000/case-studio/files'))
    ).json()
    expect(list.map((f: { file: string }) => f.file)).toEqual([other])
    const trash = await (
      await routes.GET(new Request('http://localhost:3000/case-studio/files?deleted=1'))
    ).json()
    expect(trash.map((f: { file: string }) => f.file)).toEqual([file])
    expect((await routes.PATCH(request('PATCH'))).status).toBe(200)
    expect(await fs.readFile(path.join(directory, file))).toEqual(original)
    expect(await fs.readFile(path.join(directory, other))).toEqual(original)
  })
  it('rejects traversal and cross-origin mutations', async () => {
    for (const method of ['DELETE', 'PATCH'] as const) {
      expect((await routes[method](request(method, '../../outside.json'))).status).toBe(404)
      expect((await routes[method](request(method, file, 'https://other.example'))).status).toBe(
        403,
      )
    }
  })
  it('does not overwrite an existing file when restoring', async () => {
    const trash = path.join(temp, 'placeholder/case-studio/exports/.deleted', file)
    await fs.writeFile(trash, 'different copy')
    expect((await routes.PATCH(request('PATCH'))).status).toBe(409)
    expect(await fs.readFile(trash, 'utf8')).toBe('different copy')
  })
  it('keeps both mutation endpoints unavailable in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect((await routes.DELETE(request('DELETE'))).status).toBe(404)
    expect((await routes.PATCH(request('PATCH'))).status).toBe(404)
    vi.stubEnv('NODE_ENV', 'development')
  })
})
