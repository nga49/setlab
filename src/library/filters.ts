import type { LibTrack } from '../data/effective'
import { searchTracks } from '../data/search'
import { ALL_KEYS } from '../engine/camelot'
import { createStore } from '../state/store'

export type SortId = 'artist' | 'bpm' | 'key' | 'energy' | 'added' | 'year'
export type SourceFilter = 'all' | 'rekordbox' | 'wishlist' | 'estimated' | 'demo'

export interface LibraryFilters {
  q: string
  sort: SortId
  genres: string[]
  bpm: [number, number]
  energy: [number, number]
  tags: string[]
  source: SourceFilter
}

export const DEFAULT_FILTERS: LibraryFilters = {
  q: '',
  sort: 'artist',
  genres: [],
  bpm: [60, 180],
  energy: [1, 10],
  tags: [],
  source: 'all',
}

export const libraryFilters = createStore<LibraryFilters>({ ...DEFAULT_FILTERS })

export function activeFilterCount(f: LibraryFilters): number {
  return (
    (f.genres.length ? 1 : 0) +
    (f.bpm[0] !== 60 || f.bpm[1] !== 180 ? 1 : 0) +
    (f.energy[0] !== 1 || f.energy[1] !== 10 ? 1 : 0) +
    (f.tags.length ? 1 : 0) +
    (f.source !== 'all' ? 1 : 0)
  )
}

const KEY_ORDER = new Map(ALL_KEYS.map((k, i) => [k, i]))

export function applyFilters(tracks: LibTrack[], f: LibraryFilters, key: string | null): LibTrack[] {
  let list = tracks.filter((t) => {
    if (key && t.camelot !== key) return false
    if (f.genres.length && !f.genres.includes(t.genre ?? '')) return false
    if (t.bpm != null && (t.bpm < f.bpm[0] || t.bpm > f.bpm[1])) return false
    if (t.bpm == null && (f.bpm[0] !== 60 || f.bpm[1] !== 180)) return false
    if (t.energy < f.energy[0] || t.energy > f.energy[1]) return false
    if (f.tags.length && !f.tags.every((x) => t.tags.includes(x))) return false
    switch (f.source) {
      case 'rekordbox':
        return t.source === 'rekordbox'
      case 'wishlist':
        return t.status === 'wishlist'
      case 'estimated':
        return t.estimated
      case 'demo':
        return t.source === 'demo'
      default:
        return true
    }
  })
  if (f.q.trim()) return searchTracks(list, f.q, 100000)
  const cmp: Record<SortId, (a: LibTrack, b: LibTrack) => number> = {
    artist: (a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title),
    bpm: (a, b) => (a.bpm ?? 999) - (b.bpm ?? 999),
    key: (a, b) => (KEY_ORDER.get(a.camelot ?? '') ?? 99) - (KEY_ORDER.get(b.camelot ?? '') ?? 99) || (a.bpm ?? 0) - (b.bpm ?? 0),
    energy: (a, b) => b.energy - a.energy,
    added: (a, b) => (b.stored.dateAdded ?? '').localeCompare(a.stored.dateAdded ?? ''),
    year: (a, b) => (b.year ?? 0) - (a.year ?? 0),
  }
  list = [...list].sort(cmp[f.sort])
  return list
}
