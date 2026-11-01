import { createStore } from '../state/store'
import type { PartyId } from '../engine/parties'

export type FinderMode = 'classics' | 'party' | 'trending' | 'gap' | 'spotify'

export interface GapTarget {
  camelot: string
  bpmFrom: number
  bpmTo: number
  genre: string | null
}

export interface MissingDraft {
  mode: FinderMode
  eraFrom: number
  eraTo: number
  genreText: string
  party: PartyId
  trendGenre: string
  trendBpm: [number, number]
  vibe: string
  gap: GapTarget | null
  listFilter: 'missing' | 'pending' | 'owned' | 'all'
}

export const missingDraft = createStore<MissingDraft>({
  mode: 'classics',
  eraFrom: 2000,
  eraTo: 2009,
  genreText: 'party anthems',
  party: 'wedding',
  trendGenre: 'Afro House',
  trendBpm: [120, 126],
  vibe: '',
  gap: null,
  listFilter: 'all',
})
