/** Engine types. The engine is pure TypeScript: no React, no network, no DB. */

export type Mode = 'smooth' | 'journey' | 'keytour'
export type ArcId = 'full' | 'peak' | 'opener' | 'closer' | 'tension' | 'gentle'
/** Intended energy direction for a transition. */
export type Direction = 'up' | 'down' | 'flat' | 'any'

/** A track with effective values (override > rekordbox > estimate > heuristic). */
export interface EngineTrack {
  id: string
  artist: string
  title: string
  remix: string | null
  /** Normalized genre label (see genres.ts), or the raw text for unknown genres. */
  genre: string | null
  bpm: number | null
  camelot: string | null
  /** Always set, 1 to 10. */
  energy: number
  lengthSec: number | null
  year: number | null
  tags: string[]
}

export interface Weights {
  key: number
  bpm: number
  energy: number
  genre: number
}

/** Personal ratings turned into fast lookups (see score.ts buildRatingsIndex). */
export interface RatingsIndex {
  /** `${fromId}>${toId}` → -1 | 0 | 1 */
  pair: Map<string, number>
  /** `${keyMove}|${bpmBucket}` → bonus points, already capped to ±4 */
  pattern: Map<string, number>
}

export interface ScoreContext {
  maxPitchPct: number
  /** Genre families table (editable in Settings). Defaults to DEFAULT_GENRE_TABLE. */
  genres?: import('./genres').GenreTable
  keylock: boolean
  ratings?: RatingsIndex
  /** Track ids played recently (history, last N days): −6 when arriving at them. */
  recent?: Set<string>
}

export interface TransitionParts {
  key: number
  bpm: number
  energy: number
  genre: number
}

export interface TransitionResult {
  fromId: string
  toId: string
  score: number
  color: 'good' | 'ok' | 'bad'
  reasons: string[]
  parts: TransitionParts
  keyMove: string
  personal: number
  tagPenalty: number
}
