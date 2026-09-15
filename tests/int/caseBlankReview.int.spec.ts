import { describe, expect, it } from 'vitest'
import { CaseBlanks } from '@/collections/CaseBlanks'

const hook = CaseBlanks.hooks!.beforeChange![0]
const original = {
  previewStatus: 'approved',
  sampleStatus: 'validated',
  geometryVersion: 'v1',
  geometry: { holes: 6 },
  supplierVariant: 'Model A',
  reviewedBy: 3,
}
const apply = (data: Record<string, unknown>) =>
  hook({
    data,
    originalDoc: original,
    operation: 'update',
    req: { user: { id: 7 } },
    context: {},
    collection: CaseBlanks,
  } as unknown as Parameters<typeof hook>[0])

describe('case model review boundaries', () => {
  it('preserves ready-for-review status when a new package is created', async () => {
    const result = await hook({
      data: { geometryVersion: 'v1', geometry: { holes: 6 }, previewStatus: 'review' },
      originalDoc: {},
      operation: 'create',
      req: { user: { id: 7 } },
      context: {},
      collection: CaseBlanks,
    } as unknown as Parameters<typeof hook>[0])
    expect(result.previewStatus).toBe('review')
    expect(result).not.toHaveProperty('reviewedAt')
  })
  it('resets preview and sample approval when the geometry changes', async () => {
    const result = await apply({ geometryVersion: 'v2', previewStatus: 'approved' })
    expect(result).toMatchObject({
      previewStatus: 'draft',
      sampleStatus: 'pending',
      reviewedBy: null,
      reviewedAt: null,
    })
  })
  it('requires a fresh review when a different supplier variant is substituted', async () => {
    expect(await apply({ supplierVariant: 'Model B' })).toMatchObject({
      previewStatus: 'draft',
      sampleStatus: 'pending',
    })
  })
  it('invalidates approval when review pictures are replaced', async () => {
    expect(
      await apply({ reviewImages: [{ caption: 'New camera detail', image: 12 }] }),
    ).toMatchObject({
      previewStatus: 'draft',
      sampleStatus: 'pending',
      buildStage: 'queued',
    })
  })
  it('keeps review decisions intact when only notes change', async () => {
    expect(await apply({ reviewNotes: 'Additional reference' })).toEqual({
      reviewNotes: 'Additional reference',
    })
  })
  it('records the reviewer only for an actual decision, not a ready-for-review transition', async () => {
    expect(await apply({ previewStatus: 'changes' })).toMatchObject({ reviewedBy: 7 })
    expect(await apply({ previewStatus: 'review' })).not.toHaveProperty('reviewedAt')
  })
})
