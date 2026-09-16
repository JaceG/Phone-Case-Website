import type { Placement } from '@/components/case-studio/artwork'
import type { StudioPhone } from '@/lib/studio-publish/types'
import { adaptPlacement, validatePlacement } from '@/lib/studio-publish/placement'

export type ModelSettings = {
  phones: number[]
  placements: Record<string, { version: string; placement: Placement }>
}

// The existing placement JSON stores the shared fit plus sparse per-phone fits.
// Older snapshots contain only the shared placement and remain readable.
export function savedModelSettings(value: unknown): ModelSettings | undefined {
  return (value as { modelSettings?: ModelSettings } | null)?.modelSettings
}

export function validateModelSettings(value: ModelSettings, phones: StudioPhone[]): ModelSettings {
  if (
    !value ||
    !Array.isArray(value.phones) ||
    value.phones.length > 100 ||
    value.phones.some((id) => !Number.isSafeInteger(id) || !phones.some((p) => p.id === id)) ||
    !value.placements ||
    typeof value.placements !== 'object' ||
    Array.isArray(value.placements) ||
    Object.keys(value.placements).length > 100
  )
    throw new Error('Choose from the approved phone models.')
  const placements: ModelSettings['placements'] = {}
  for (const [id, fit] of Object.entries(value.placements)) {
    const phone = phones.find((p) => String(p.id) === id)
    if (!phone || !fit || fit.version !== phone.version)
      throw new Error('A case model changed. Review or reset its custom fit before saving.')
    placements[id] = {
      version: phone.version,
      placement: validatePlacement(fit.placement, phone.params),
    }
  }
  return { phones: [...new Set(value.phones)].sort((a, b) => a - b), placements }
}

export function renderPlacements(
  shared: Placement,
  settings: ModelSettings,
  phones: StudioPhone[],
) {
  const valid = validateModelSettings(settings, phones)
  return Object.fromEntries(
    valid.phones.map((id) => {
      const phone = phones.find((p) => p.id === id)!
      return [
        String(id),
        valid.placements[String(id)]?.placement ?? adaptPlacement(shared, phone.params),
      ]
    }),
  )
}
