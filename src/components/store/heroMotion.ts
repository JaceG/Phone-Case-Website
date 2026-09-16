/** Same 288 time-distributed samples and tilted axis as Blender's hero loop. */
export const HERO_LOOP_SECONDS = 3.55
export const HERO_SAMPLE_COUNT = 288
export const HERO_TILT = (26 * Math.PI) / 180
export const HERO_LEAN = (12 * Math.PI) / 180
export const frontLingers =
  (boost = 3, halfWidth = 0.14) =>
  (phase: number) => {
    const distance = Math.min(phase, 1 - phase)
    if (distance >= halfWidth) return boost
    const window = 0.5 * (1 + Math.cos((Math.PI * distance) / halfWidth))
    return boost - (boost - 1) * window
  }
const speed = frontLingers(37.6, 0.14)
const resolution = 20000
const cumulative = [0]
for (let i = 0; i < resolution; i++) {
  cumulative.push(cumulative[i] + 1 / speed((i + 0.5) / resolution) / resolution)
}
export const HERO_PHASES = Array.from({ length: HERO_SAMPLE_COUNT + 1 }, (_, index) => {
  if (index === HERO_SAMPLE_COUNT) return 1
  const target = (cumulative[resolution] * index) / HERO_SAMPLE_COUNT
  let lo = 0,
    hi = resolution
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1
    if (cumulative[mid] <= target) lo = mid
    else hi = mid
  }
  return (lo + (target - cumulative[lo]) / (cumulative[lo + 1] - cumulative[lo])) / resolution
})
export function heroPhaseAt(seconds: number): number {
  const frame = ((seconds % HERO_LOOP_SECONDS) / HERO_LOOP_SECONDS) * HERO_SAMPLE_COUNT
  const i = Math.floor(frame)
  return HERO_PHASES[i] + (HERO_PHASES[i + 1] - HERO_PHASES[i]) * (frame - i)
}
