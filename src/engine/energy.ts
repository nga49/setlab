import type { Direction } from './types'
import { GENRE_BPM } from './genres'

/** Energy model (docs/ENGINE.md §4). Energy is 1 to 10. */

/** Base energy per genre for the heuristic. */
export const GENRE_BASE_ENERGY: Record<string, number> = {
  'Deep House': 4,
  'Organic House / Downtempo': 3,
  House: 5,
  'Tech House': 6,
  'Bass House': 7,
  'Afro House': 6,
  'Progressive House': 6,
  'Nu Disco / Disco': 5,
  'Indie Dance': 5,
  'Minimal / Deep Tech': 5,
  'Techno (Peak Time / Driving)': 8,
  'Techno (Raw / Deep / Hypnotic)': 7,
  'Hard Techno': 9,
  'Melodic House & Techno': 6,
  'Drum & Bass': 8,
  Dubstep: 8,
  'Breaks / Breakbeat': 7,
  Amapiano: 5,
  'Trance (Main Floor)': 8,
  Pop: 6,
  'Hip-Hop': 6,
  'R&B': 4,
  'Dance / EDM': 8,
  Latin: 6,
  Reggaeton: 7,
  'Funk / Soul': 5,
  '2000s': 7,
  '90s': 7,
  Rock: 6,
}

export const clampEnergy = (e: number) => Math.max(1, Math.min(10, e))

/**
 * Heuristic energy, always available: base by genre, ±1 by BPM vs the genre's
 * typical range, +1 for 🔥 banger. Source is labelled "heuristic" by the caller.
 */
export function heuristicEnergy(t: { genre: string | null; bpm: number | null; tags?: string[] }): number {
  let e = (t.genre && GENRE_BASE_ENERGY[t.genre]) || 5
  const range = t.genre ? GENRE_BPM[t.genre] : undefined
  if (range && t.bpm) {
    if (t.bpm > range[1]) e += 1
    else if (t.bpm < range[0]) e -= 1
  }
  if (t.tags?.includes('banger')) e += 1
  return clampEnergy(Math.round(e))
}

/**
 * Energy transition score for an intended direction.
 * - right direction and |Δ| ≤ 2 → 1.0 · flat when wanted → 1.0
 * - |Δ| = 3 in the right direction → 0.6
 * - wrong direction by 1 → 0.6, by 2+ → 0.2
 * - drop of 3+ (crash) outside a release (down) phase → 0.05
 */
export function energyScore(from: number, to: number, direction: Direction = 'any'): number {
  const d = Math.round(to) - Math.round(from)
  switch (direction) {
    case 'up':
      if (d >= 1 && d <= 2) return 1
      if (d === 0) return 0.8
      if (d === 3) return 0.6
      if (d >= 4) return 0.3
      if (d === -1) return 0.6
      if (d === -2) return 0.2
      return 0.05
    case 'down':
      if (d <= -1 && d >= -2) return 1
      if (d === 0) return 0.8
      if (d === -3) return 0.6
      if (d <= -4) return 0.2
      if (d === 1) return 0.6
      return 0.2
    case 'flat':
      if (d === 0) return 1
      if (Math.abs(d) === 1) return 0.9
      if (Math.abs(d) === 2) return 0.6
      if (d >= 3) return 0.3
      return 0.05
    default:
      if (Math.abs(d) <= 1) return 1
      if (Math.abs(d) === 2) return 0.85
      if (d === 3) return 0.6
      if (d >= 4) return 0.4
      return 0.05
  }
}

export function energyText(from: number, to: number, score: number): string {
  const d = Math.round(to) - Math.round(from)
  const sign = d > 0 ? '+' : d < 0 ? '−' : '±'
  const mark = score >= 0.85 ? ' ✓' : score < 0.5 ? ' ✕' : ''
  return `energy ${sign}${Math.abs(d)}${mark}`
}
