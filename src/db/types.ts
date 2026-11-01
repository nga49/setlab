/** Stored shapes for the on-device database. See docs/DATA.md §2. */

export type TrackSource = 'rekordbox' | 'local' | 'demo'
export type TrackStatus = 'active' | 'wishlist' | 'removed'

/** A track as stored: synced from tracks.json, quick-added on the phone, or demo. */
export interface StoredTrack {
  id: string // "rb:<id>" · "local:<uuid>" · "demo:<nn>"
  artist: string
  title: string
  remix: string | null
  album?: string | null
  label?: string | null
  genre: string | null // raw genre text
  bpm: number | null
  keyRaw?: string | null
  camelot: string | null
  lengthSec: number | null
  year: number | null
  rating?: number
  comment?: string | null
  dateAdded?: string | null
  playlists?: string[]
  myTag?: string[]
  source: TrackSource
  status: TrackStatus
  /** Tags shipped with demo data only; real tags live in overrides. */
  demoTags?: string[]
}

/** Manual edits. Never touched by sync. */
export interface Override {
  trackId: string
  energy?: number | null
  genre?: string | null
  bpm?: number | null
  camelot?: string | null
  year?: number | null
  tags?: string[]
  notes?: string
  updatedAt: string
}

export type Confidence = 'high' | 'medium' | 'low'

/** AI estimates for a track (docs/AI.md). */
export interface Estimate {
  trackId: string
  bpm: number | null
  camelot: string | null
  keyName?: string | null
  genre: string | null
  energy: number | null
  year: number | null
  confidence: Confidence
  note?: string
  model: string
  date: string
}

export type SetMode = 'smooth' | 'journey' | 'keytour'
export type ArcId = 'full' | 'peak' | 'opener' | 'closer' | 'tension' | 'gentle'

/** Snapshot of a track inside a saved set, so sets survive library changes. */
export interface SetItemSnapshot {
  trackId: string
  artist: string
  title: string
  remix: string | null
  bpm: number | null
  camelot: string | null
  lengthSec: number | null
}

export interface SavedSet {
  id: string
  name: string
  mode: SetMode
  arc: ArcId
  options?: Record<string, unknown>
  trackIds: string[]
  items: SetItemSnapshot[]
  locks: string[]
  pins?: { first?: string; last?: string }
  score?: number
  durationSec?: number
  notes?: string
  tags?: string[]
  kind?: 'organizer' | 'party'
  createdAt: string
  updatedAt: string
}

export interface Play {
  trackId: string
  at: string
}

export interface Session {
  id: string
  kind: 'live' | 'practice'
  start: string
  end?: string
  setId?: string
  plays: Play[]
  /** Snapshots for display even if tracks leave the library. */
  snapshots?: Record<string, { artist: string; title: string; camelot: string | null; bpm: number | null }>
}

/** -1 👎 · 0 👌 · 1 🔥 */
export type RatingValue = -1 | 0 | 1

export interface Rating {
  key: string // `${fromId}>${toId}`
  fromId: string
  toId: string
  rating: RatingValue
  note?: string
  date: string
  /** Pattern data captured at rating time (key move label + bpm delta bucket). */
  keyMove?: string
  bpmBucket?: string
}

export type MissingStatus = 'missing' | 'pending' | 'owned'
export type MissingMode = 'classics' | 'party' | 'trending' | 'gap' | 'spotify' | 'request' | 'manual'

export interface MissingItem {
  id: string
  artist: string
  title: string
  remix: string | null
  year: number | null
  genre: string | null
  estBpm: number | null
  estCamelot: string | null
  energy: number | null
  why?: string
  mode: MissingMode
  status: MissingStatus
  matchedTrackId?: string | null
  confidence?: Confidence
  savedAt: string
  query?: string
}

export interface AiCacheEntry {
  hash: string
  feature: string
  date: string
  response: unknown
}

export interface AiUsage {
  month: string // yyyy-mm
  inputTokens: number
  outputTokens: number
  webSearches: number
  costUsd: number
  calls: number
}

export interface SettingRow {
  key: string
  value: unknown
}
