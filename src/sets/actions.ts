import { db, nowIso, uid } from '../db/db'
import type { SavedSet, SetItemSnapshot } from '../db/types'
import type { Library } from '../data/LibraryProvider'
import { heuristicEnergy } from '../engine/energy'
import { normalizeGenre } from '../engine/genres'
import { MODE_WEIGHTS, Prepared } from '../engine/score'
import type { EngineTrack, Mode } from '../engine/types'
import type { EditorDraft } from './draft'

/** Owned tracks plus any picked tracks that are not owned (wishlist / unknown). */
export function generationLibrary(lib: Library, picked: string[]): EngineTrack[] {
  const out: EngineTrack[] = [...lib.owned]
  const seen = new Set(out.map((t) => t.id))
  for (const id of picked) {
    const t = lib.byId.get(id)
    if (t && !seen.has(id)) {
      out.push(t)
      seen.add(id)
    }
  }
  return out
}

export function snapshot(t: EngineTrack): SetItemSnapshot {
  return { trackId: t.id, artist: t.artist, title: t.title, remix: t.remix, bpm: t.bpm, camelot: t.camelot, lengthSec: t.lengthSec }
}

/** Resolve a saved set's tracks; tracks no longer in the library come back from their snapshot. */
export function resolveTracks(ids: string[], items: SetItemSnapshot[] | undefined, lib: Library): EngineTrack[] {
  const snaps = new Map((items ?? []).map((s) => [s.trackId, s]))
  const out: EngineTrack[] = []
  for (const id of ids) {
    const t = lib.byId.get(id)
    if (t) {
      out.push(t)
      continue
    }
    const s = snaps.get(id)
    if (!s) continue
    out.push({
      id: s.trackId,
      artist: s.artist,
      title: s.title,
      remix: s.remix,
      genre: null,
      bpm: s.bpm,
      camelot: s.camelot,
      energy: heuristicEnergy({ genre: normalizeGenre(null), bpm: s.bpm }),
      lengthSec: s.lengthSec,
      year: null,
      tags: [],
    })
  }
  return out
}

/**
 * Swap: best replacement from the library for the track arriving at position i
 * (or the one before it when that track is locked). Returns null if nothing fits.
 */
export function swapAt(tracks: EngineTrack[], i: number, lib: Library, mode: Mode, locked: Set<string>): EngineTrack[] | null {
  let pos = i
  if (locked.has(tracks[pos]!.id)) pos = i - 1
  if (pos < 0 || locked.has(tracks[pos]!.id)) return null
  const inSet = new Set(tracks.map((t) => t.id))
  const cands = lib.owned.filter((t) => !inSet.has(t.id))
  if (!cands.length) return null
  const p = new Prepared([...tracks, ...cands], lib.ctx)
  const w = MODE_WEIGHTS[mode]
  let best = -1
  let bestV = -Infinity
  for (let c = tracks.length; c < p.n; c++) {
    const v = (pos > 0 ? p.score(pos - 1, c, w) : 60) + (pos < tracks.length - 1 ? p.score(c, pos + 1, w) : 60)
    if (v > bestV) {
      bestV = v
      best = c
    }
  }
  if (best < 0) return null
  const next = tracks.slice()
  next[pos] = cands[best - tracks.length]!
  return next
}

/** Bridge: insert the best connecting track between positions i−1 and i. */
export function bridgeAt(tracks: EngineTrack[], i: number, lib: Library): EngineTrack[] | null {
  if (i <= 0 || i >= tracks.length) return null
  const g = lib.graph()
  const exclude = new Set(tracks.map((t) => t.id))
  const prev = tracks[i - 1]!
  const next = tracks[i]!
  if (g.indexOf(prev.id) === undefined || g.indexOf(next.id) === undefined) return null
  const b = g.bridges(prev.id, next.id, { exclude, k: 1 })
  const pick = b.singles[0]
  if (!pick) return null
  return [...tracks.slice(0, i), pick.track, ...tracks.slice(i)]
}

export async function saveSet(
  d: EditorDraft,
  tracks: EngineTrack[],
  score: number,
  durationSec: number,
): Promise<string> {
  const id = d.setId ?? uid('set:')
  const now = nowIso()
  const set: SavedSet = {
    id,
    name: d.name.trim() || 'Untitled set',
    mode: d.mode,
    arc: d.arc,
    trackIds: tracks.map((t) => t.id),
    items: tracks.map(snapshot),
    locks: d.locks.filter((l) => tracks.some((t) => t.id === l)),
    pins: { first: d.pinFirst ?? undefined, last: d.pinLast ?? undefined },
    score,
    durationSec,
    notes: d.notes,
    tags: d.tags,
    kind: d.kind,
    createdAt: d.createdAt ?? now,
    updatedAt: now,
  }
  await db.sets.put(set)
  return id
}

export async function duplicateSet(id: string): Promise<string | null> {
  const s = await db.sets.get(id)
  if (!s) return null
  const copy: SavedSet = { ...s, id: uid('set:'), name: `${s.name} (copy)`, createdAt: nowIso(), updatedAt: nowIso() }
  await db.sets.put(copy)
  return copy.id
}

export async function deleteSet(id: string): Promise<void> {
  await db.sets.delete(id)
}
