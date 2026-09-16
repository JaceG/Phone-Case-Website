import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import CaseStudio from '@/components/case-studio/CaseStudio'

const notifications = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}))
vi.mock('sonner', () => ({ toast: notifications.toast }))
vi.mock('@/components/case-studio/CaseViewer', () => ({ default: () => null }))
vi.mock('@/components/case-studio/FlatLayoutEditor', () => ({ default: () => null }))
const file = (name: string) => ({
  file: name,
  name,
  url: `/case-studio/files?file=${name}`,
  project: false,
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function setup(fail = false) {
  const active = [file('one.png'), file('two.png')]
  const deleted = [file('previously-deleted.png')]
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE' || init?.method === 'PATCH')
      return new Response(fail && url.endsWith('two.png') ? 'File unavailable' : '{}', {
        status: fail && url.endsWith('two.png') ? 404 : 200,
      })
    if (url === '/case-studio/files') return Response.json(active)
    if (url === '/case-studio/files?deleted=1') return Response.json(deleted)
    return new Response(null, { status: 404 })
  })
  vi.stubGlobal('fetch', fetcher)
  render(createElement(CaseStudio))
  return fetcher
}

describe('saved-file bulk controls', () => {
  it('clears the saved list and Undo restores only that batch, leaving earlier deleted files alone', async () => {
    const fetcher = setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Clear all' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Delete one.png' })).toBeNull())
    expect(screen.getByText('Deleted files (3)')).toBeTruthy()
    const undo = notifications.toast.mock.calls[0][1].action.onClick
    await act(async () => {
      undo()
    })
    await screen.findByRole('button', { name: 'Delete one.png' })
    expect(screen.getByRole('button', { name: 'Delete two.png' })).toBeTruthy()
    expect(screen.getByText('Deleted files (1)')).toBeTruthy()
    const changes = fetcher.mock.calls.filter(([, init]) => init?.method)
    expect(changes.map(([url, init]) => [url, init?.method])).toEqual([
      ['/case-studio/files?file=one.png', 'DELETE'],
      ['/case-studio/files?file=two.png', 'DELETE'],
      ['/case-studio/files?file=one.png', 'PATCH'],
      ['/case-studio/files?file=two.png', 'PATCH'],
    ])
  })
  it('keeps failed deletions in the list and offers Undo only for successful deletions', async () => {
    const fetcher = setup(true)
    fireEvent.click(await screen.findByRole('button', { name: 'Clear all' }))
    await waitFor(() => expect(notifications.toast.error).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Delete one.png' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Delete two.png' })).toBeTruthy()
    await act(async () => {
      notifications.toast.mock.calls[0][1].action.onClick()
    })
    await screen.findByRole('button', { name: 'Delete one.png' })
    expect(
      fetcher.mock.calls.filter(([, init]) => init?.method === 'PATCH').map(([url]) => url),
    ).toEqual(['/case-studio/files?file=one.png'])
  })
})
