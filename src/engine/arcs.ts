import type { ArcId, Direction } from './types'

/** Energy arcs (docs/ENGINE.md §6): t ∈ [0,1] → target energy. */

export interface ArcPoint {
  t: number
  e: number
  phase: string
}

export interface Arc {
  id: ArcId
  label: string
  points: ArcPoint[]
}

function peakTimePoints(): ArcPoint[] {
  // 7 → 9 plateau with 1-point dips every ~20%
  const pts: ArcPoint[] = [{ t: 0, e: 7, phase: 'build' }, { t: 0.12, e: 9, phase: 'peak' }]
  for (const c of [0.2, 0.4, 0.6, 0.8]) {
    pts.push({ t: c, e: 8, phase: 'breather' })
    pts.push({ t: c + 0.08, e: 9, phase: 'peak' })
  }
  pts.push({ t: 1, e: 9, phase: 'peak' })
  return pts
}

export const ARCS: Record<Exclude<ArcId, 'gentle'>, Arc> = {
  full: {
    id: 'full',
    label: 'Full arc',
    points: [
      { t: 0, e: 4, phase: 'warm-up' },
      { t: 1 / 6, e: 5, phase: 'groove' },
      { t: 2 / 6, e: 7, phase: 'build' },
      { t: 3 / 6, e: 9, phase: 'peak' },
      { t: 4 / 6, e: 7, phase: 'release' },
      { t: 5 / 6, e: 9, phase: 'final climax' },
      { t: 1, e: 6, phase: 'landing' },
    ],
  },
  peak: { id: 'peak', label: 'Peak-time', points: peakTimePoints() },
  opener: {
    id: 'opener',
    label: 'Opener / warm-up',
    points: [
      { t: 0, e: 3, phase: 'warm-up' },
      { t: 0.5, e: 4.5, phase: 'groove' },
      { t: 1, e: 6, phase: 'build' },
    ],
  },
  closer: {
    id: 'closer',
    label: 'Closer / sunrise',
    points: [
      { t: 0, e: 7, phase: 'peak' },
      { t: 0.35, e: 5.5, phase: 'release' },
      { t: 0.55, e: 7, phase: 'emotional bump' },
      { t: 0.75, e: 5, phase: 'landing' },
      { t: 1, e: 4, phase: 'sunrise' },
    ],
  },
  tension: {
    id: 'tension',
    label: 'Tension build',
    points: [
      { t: 0, e: 5, phase: 'groove' },
      { t: 0.5, e: 7, phase: 'build' },
      { t: 1, e: 9, phase: 'peak' },
    ],
  },
}

export const ARC_IDS = Object.keys(ARCS) as Exclude<ArcId, 'gentle'>[]

/**
 * Gentle arc used by Smooth and Key tour (the arc option is for Journey only):
 * a soft rise across the pool's own energy range (25th → 75th percentile).
 */
export function gentleArc(energies: number[]): Arc {
  const s = [...energies].sort((a, b) => a - b)
  const q = (p: number) => (s.length ? s[Math.min(s.length - 1, Math.round(p * (s.length - 1)))]! : 5)
  const lo = q(0.25)
  const hi = Math.max(lo, q(0.75))
  return {
    id: 'gentle',
    label: 'Gentle',
    points: [
      { t: 0, e: lo, phase: 'groove' },
      { t: 1, e: hi, phase: 'build' },
    ],
  }
}

export function getArc(id: ArcId, energies: number[] = []): Arc {
  return id === 'gentle' ? gentleArc(energies) : ARCS[id]
}

/** Shift an arc up/down (party energy slider), clamped 1 to 10. */
export function offsetArc(arc: Arc, delta: number): Arc {
  if (!delta) return arc
  return { ...arc, points: arc.points.map((p) => ({ ...p, e: Math.max(1, Math.min(10, p.e + delta)) })) }
}

export function arcTarget(arc: Arc, t: number): number {
  const pts = arc.points
  const x = Math.max(0, Math.min(1, t))
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    if (x <= b.t) {
      const span = b.t - a.t || 1
      return a.e + ((b.e - a.e) * (x - a.t)) / span
    }
  }
  return pts[pts.length - 1]!.e
}

/** Phase label at t: the phase of the nearest control point. */
export function arcPhase(arc: Arc, t: number): string {
  let best = arc.points[0]!
  for (const p of arc.points) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p
  return best.phase
}

/** Intended direction between two positions on the arc. */
export function arcDirection(arc: Arc, t0: number, t1: number): Direction {
  const d = arcTarget(arc, t1) - arcTarget(arc, t0)
  if (d > 0.35) return 'up'
  if (d < -0.35) return 'down'
  return 'flat'
}

/** 100 − mean absolute error × 12, clamped to 0..100. */
export function arcFit(energies: number[], positions: number[], arc: Arc): number {
  if (!energies.length) return 0
  let err = 0
  for (let i = 0; i < energies.length; i++) err += Math.abs(energies[i]! - arcTarget(arc, positions[i]!))
  return Math.max(0, Math.min(100, 100 - (err / energies.length) * 12))
}

/** Midpoint position t of each track in a sequence of lengths with overlaps. */
export function positionsOf(lengths: number[], overlapSec: number): number[] {
  const total = lengths.reduce((a, b) => a + b, 0) - Math.max(0, lengths.length - 1) * overlapSec
  if (total <= 0) return lengths.map((_, i) => (lengths.length > 1 ? i / (lengths.length - 1) : 0))
  const out: number[] = []
  let start = 0
  for (const len of lengths) {
    out.push(Math.max(0, Math.min(1, (start + len / 2) / total)))
    start += len - overlapSec
  }
  return out
}
