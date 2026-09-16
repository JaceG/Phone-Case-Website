import { describe, it, expect, vi } from 'vitest'
import { requireStudioPreviews } from '@/lib/catalog/requireStudioPreviews'
const check = (data: object, originalDoc: object, isStudio = true) =>
  requireStudioPreviews({
    data,
    originalDoc,
    req: { payload: { find: vi.fn().mockResolvedValue({ docs: isStudio ? [{ id: 51 }] : [] }) } },
  } as never)
describe('Studio publication readiness', () => {
  it('blocks publishing a Studio draft with no generated presentation', async () => {
    await expect(
      check(
        { _status: 'published' },
        { id: 43, renderStatus: 'pending', studioPresentation: null },
      ),
    ).rejects.toThrow('case previews first')
  })
  it('allows saving drafts while renders are pending', async () => {
    const data = { _status: 'draft' }
    expect(await check(data, { id: 43, renderStatus: 'pending' })).toEqual(data)
  })
  it('allows publishing a complete generated presentation', async () => {
    const data = {
      _status: 'published',
      renderStatus: 'ready',
      studioPresentation: { models: { '66': { hero: '/api/media/file/hero.webp' } } },
    }
    expect(await check(data, { id: 43 })).toEqual(data)
  })
  it('does not mistake a cleared draft presentation for its older published images', async () => {
    await expect(
      check(
        { _status: 'published', renderStatus: 'pending', studioPresentation: null },
        { id: 43, renderStatus: 'ready', studioPresentation: { models: { '66': {} } } },
      ),
    ).rejects.toThrow()
  })
  it('preserves the separate manual presentation import workflow', async () => {
    const data = { _status: 'published' }
    expect(await check(data, { id: 25 }, false)).toEqual(data)
  })
})
