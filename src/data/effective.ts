import { parseKey } from '../engine/camelot'
import { clampEnergy, heuristicEnergy } from '../engine/energy'
import { DEFAULT_GENRE_TABLE, normalizeGenre, type GenreTable } from '../engine/genres'
import type { EngineTrack } from '../engine/types'
import type { Estimate, Override, StoredTrack, TrackSource, TrackStatus } from '../db/types'

/** Where an effective value comes from (UI source badges). */
export type FieldSource = 'rekordbox' | 'demo' | 'estimate' | 'manual' | 'heuristic' | 'none'
export type FieldName = 'bpm' | 'camelot' | 'genre' | 'energy' | 'year'

/** A library track with effective values and per-field sources. */
export interface LibTrack extends EngineTrack {
  source: TrackSource
  status: TrackStatus
  sources: Record<FieldName, FieldSource>
  stored: StoredTrack
  notes: string
  /** True when at least one engine field comes from an AI estimate. */
  estimated: boolean
  genreRaw: string | null
}

function baseSource(t: StoredTrack): FieldSource {
  return t.source === 'demo' ? 'demo' : t.source === 'rekordbox' ? 'rekordbox' : 'manual'
}

/** Effective value per field: override > rekordbox > estimate > heuristic (docs/DATA.md §2). */
export function toLibTrack(
  t: StoredTrack,
  o: Override | undefined,
  e: Estimate | undefined,
  table: GenreTable = DEFAULT_GENRE_TABLE,
): LibTrack {
  const base = baseSource(t)
  const pick = <V>(ov: V | null | undefined, stored: V | null | undefined, est: V | null | undefined): [V | null, FieldSource] => {
    if (ov != null) return [ov, 'manual']
    if (stored != null) return [stored, base]
    if (est != null) return [est, 'estimate']
    return [null, 'none']
  }
  const [bpm, sBpm] = pick(o?.bpm, t.bpm, e?.bpm)
  const [camelotRaw, sKey] = pick(o?.camelot, t.camelot ?? parseKey(t.keyRaw), e?.camelot)
  const [genreRaw, sGenre] = pick(o?.genre, t.genre, e?.genre)
  const [year, sYear] = pick(o?.year, t.year, e?.year)
  const genre = normalizeGenre(genreRaw, table)
  const tags = o?.tags ?? t.demoTags ?? []
  let energy: number
  let sEnergy: FieldSource
  if (o?.energy != null) {
    energy = o.energy
    sEnergy = 'manual'
  } else if (e?.energy != null) {
    energy = e.energy
    sEnergy = 'estimate'
  } else {
    energy = heuristicEnergy({ genre, bpm, tags })
    sEnergy = 'heuristic'
  }
  const sources = { bpm: sBpm, camelot: sKey, genre: sGenre, energy: sEnergy, year: sYear }
  return {
    id: t.id,
    artist: t.artist,
    title: t.title,
    remix: t.remix,
    genre,
    genreRaw,
    bpm,
    camelot: camelotRaw ? parseKey(camelotRaw) : null,
    energy: clampEnergy(energy),
    lengthSec: t.lengthSec,
    year,
    tags,
    source: t.source,
    status: t.status,
    sources,
    stored: t,
    notes: o?.notes ?? '',
    estimated: Object.values(sources).includes('estimate'),
  }
}

export function displayTitle(t: { title: string; remix: string | null }): string {
  return t.remix ? `${t.title} (${t.remix})` : t.title
}
