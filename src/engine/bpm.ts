/** BPM model (docs/ENGINE.md §2). */

export type BpmRelation = 'normal' | 'double' | 'half'

/**
 * Distance between two tempos in percent of `a`, considering half/double time
 * (87 ↔ 174, 64 ↔ 128): min of |a−b|, |a−2b|, |2a−b|.
 */
export function bpmDistancePct(a: number, b: number): number {
  if (!(a > 0) || !(b > 0)) return Infinity
  return (Math.min(Math.abs(a - b), Math.abs(a - 2 * b), Math.abs(2 * a - b)) / a) * 100
}

/** Which relation gives the smallest distance. */
export function bpmRelation(a: number, b: number): BpmRelation {
  const n = Math.abs(a - b)
  const d = Math.abs(a - 2 * b) // b is half of a
  const h = Math.abs(2 * a - b) // b is double of a
  if (n <= d && n <= h) return 'normal'
  return d < h ? 'half' : 'double'
}

/** BPM score table. Unknown BPM on either side → 0.5. */
export function bpmScore(a: number | null | undefined, b: number | null | undefined, maxPitchPct = 6): number {
  if (!a || !b) return 0.5
  const d = bpmDistancePct(a, b)
  if (d <= 1.5) return 1.0
  if (d <= 3) return 0.85
  if (d <= 5) return 0.6
  if (d <= maxPitchPct) return 0.4
  return 0.05
}

/** Bucket of the absolute tempo change, used for personal rating patterns. */
export function bpmBucket(a: number | null | undefined, b: number | null | undefined): string {
  if (!a || !b) return 'b?'
  const d = bpmDistancePct(a, b)
  return d <= 1.5 ? 'b0' : d <= 3 ? 'b1' : d <= 5 ? 'b2' : 'b3'
}

/** Short reason text, e.g. "BPM +1", "BPM −2", "BPM 2×". */
export function bpmText(a: number | null | undefined, b: number | null | undefined, maxPitchPct = 6): string {
  if (!a || !b) return 'BPM ?'
  const rel = bpmRelation(a, b)
  const far = bpmDistancePct(a, b) > maxPitchPct ? ' ✕' : ''
  if (rel === 'double') return `BPM 2×${far}`
  if (rel === 'half') return `BPM ½×${far}`
  const diff = Math.round((b - a) * 10) / 10
  const shown = Math.abs(diff) >= 1 ? Math.round(diff) : diff
  if (shown === 0) return 'BPM ='
  return `BPM ${shown > 0 ? '+' : '−'}${Math.abs(shown)}${far}`
}
