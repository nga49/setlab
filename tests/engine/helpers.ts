import { DEMO_TRACKS } from '../../src/demo/demoTracks'
import { heuristicEnergy } from '../../src/engine/energy'
import { normalizeGenre } from '../../src/engine/genres'
import { mulberry32 } from '../../src/engine/random'
import { ALL_KEYS } from '../../src/engine/camelot'
import type { EngineTrack, ScoreContext } from '../../src/engine/types'

export const CTX: ScoreContext = { maxPitchPct: 6, keylock: true }

export function demoEngine(): EngineTrack[] {
  return DEMO_TRACKS.map((t) => {
    const genre = normalizeGenre(t.genre)
    const tags = t.demoTags ?? []
    return {
      id: t.id,
      artist: t.artist,
      title: t.title,
      remix: t.remix,
      genre,
      bpm: t.bpm,
      camelot: t.camelot,
      energy: heuristicEnergy({ genre, bpm: t.bpm, tags }),
      lengthSec: t.lengthSec,
      year: t.year,
      tags,
    }
  })
}

/** Fictional synthetic library for performance tests. */
export function benchLibrary(n: number, seed = 42): EngineTrack[] {
  const rnd = mulberry32(seed)
  const genres = ['Tech House', 'Deep House', 'House', 'Afro House', 'Melodic House & Techno', 'Techno (Peak Time / Driving)', 'Progressive House', 'Nu Disco / Disco']
  return Array.from({ length: n }, (_, i) => {
    const genre = genres[Math.floor(rnd() * genres.length)]!
    const bpm = Math.round(115 + rnd() * 20)
    return {
      id: `bench:${i}`,
      artist: `Bench Artist ${i % 300}`,
      title: `Bench Track ${i}`,
      remix: null,
      genre,
      bpm,
      camelot: ALL_KEYS[Math.floor(rnd() * 24)]!,
      energy: heuristicEnergy({ genre, bpm }),
      lengthSec: Math.round(300 + rnd() * 180),
      year: 2010 + Math.floor(rnd() * 17),
      tags: [],
    }
  })
}

export function track(id: string, camelot: string | null, bpm: number | null, energy = 5, genre: string | null = 'Tech House', lengthSec = 360): EngineTrack {
  return { id, artist: `Demo Artist ${id}`, title: `Demo Track ${id}`, remix: null, genre, bpm, camelot, energy, lengthSec, year: 2020, tags: [] }
}
