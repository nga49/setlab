import { compatibleKeys } from '../engine/camelot'

/**
 * Gap finder (docs/PRODUCT.md Library insights): key + BPM zones where the
 * library is thin, ranked by how often that zone shows up in Nico's sets.
 * Pure function: callers pass the library and the tracks used in sets.
 */

export const BAND = 6 // BPM band width

export interface Zone {
  camelot: string
  bpmFrom: number
  bpmTo: number
  /** Tracks in the library in this zone. */
  supply: number
  /** How often the zone appears in saved / generated sets (or neighbour density). */
  demand: number
  label: string
  genre: string | null
}

type T = { camelot: string | null; bpm: number | null; genre: string | null }

export function bandOf(bpm: number): number {
  return Math.floor(bpm / BAND) * BAND
}

const zoneKey = (k: string, band: number) => `${k}|${band}`

export function findGaps(library: T[], setTracks: T[], opts: { maxSupply?: number; limit?: number } = {}): Zone[] {
  const maxSupply = opts.maxSupply ?? 2
  const supply = new Map<string, number>()
  const genres = new Map<string, Map<string, number>>()
  for (const t of library) {
    if (!t.camelot || !t.bpm) continue
    const k = zoneKey(t.camelot, bandOf(t.bpm))
    supply.set(k, (supply.get(k) ?? 0) + 1)
  }
  const demand = new Map<string, number>()
  const addDemand = (t: T, w: number) => {
    if (!t.camelot || !t.bpm) return
    const band = bandOf(t.bpm)
    // A set track creates demand for its own zone and its harmonic neighbours (what mixes in and out).
    for (const k of compatibleKeys(t.camelot).green) {
      const z = zoneKey(k, band)
      demand.set(z, (demand.get(z) ?? 0) + (k === t.camelot ? w : w / 2))
      if (t.genre) {
        const g = genres.get(z) ?? new Map<string, number>()
        g.set(t.genre, (g.get(t.genre) ?? 0) + 1)
        genres.set(z, g)
      }
    }
  }
  if (setTracks.length) for (const t of setTracks) addDemand(t, 1)
  else for (const t of library) addDemand(t, 0.5) // no sets yet: density of the neighbourhood

  const out: Zone[] = []
  for (const [z, d] of demand) {
    const s = supply.get(z) ?? 0
    if (s > maxSupply || d <= 0) continue
    const [camelot, b] = z.split('|')
    const band = Number(b)
    const g = genres.get(z)
    const genre = g ? [...g.entries()].sort((a, b) => b[1] - a[1])[0]![0] : null
    out.push({
      camelot: camelot!,
      bpmFrom: band,
      bpmTo: band + BAND,
      supply: s,
      demand: Math.round(d * 10) / 10,
      genre,
      label: `${camelot} at ${band} to ${band + BAND}: ${s === 0 ? 'no track' : s === 1 ? 'only 1 track' : `only ${s} tracks`}`,
    })
  }
  out.sort((a, b) => b.demand - b.supply - (a.demand - a.supply) || b.demand - a.demand || a.camelot.localeCompare(b.camelot))
  return out.slice(0, opts.limit ?? 8)
}
