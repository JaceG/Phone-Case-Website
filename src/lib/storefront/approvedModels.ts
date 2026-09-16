import type { Payload } from 'payload'
import assets from './model-assets.json'

export type ModelAssets = {
  version: string
  geometry: string
  templateAspect: number
  designs: Record<
    string,
    {
      hero: string
      threeQuarter: string
      flat: string
      detail: string
      texture: string
    }
  >
}

export const modelAssets = assets as Record<string, ModelAssets>

/** An old export must not survive a new review or a withdrawn approval. */
export function hasCurrentApproval(
  asset: ModelAssets | undefined,
  approvedVersion: string | undefined,
): asset is ModelAssets {
  return Boolean(asset && approvedVersion && asset.version === approvedVersion)
}

/** Server-only read. Return approved ids/versions, never private review packages. */
export async function approvedModelVersions(payload: Payload): Promise<Map<number, string>> {
  const reviews = await payload.find({
    collection: 'caseBlanks',
    overrideAccess: true,
    pagination: false,
    depth: 0,
    where: {
      and: [{ previewStatus: { equals: 'approved' } }, { cameraCoverage: { equals: 'fineHoles' } }],
    },
    select: { phoneModel: true, geometryVersion: true },
  })
  return new Map(
    reviews.docs.map((r) => [
      typeof r.phoneModel === 'object' ? r.phoneModel.id : r.phoneModel,
      r.geometryVersion,
    ]),
  )
}
