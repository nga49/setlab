import { db, nowIso, uid } from '../db/db'
import type { MissingItem, MissingMode } from '../db/types'
import { Matcher, normalizeArtist, normalizeText, type TrackRef } from '../engine/match'
import type { DiscoveredTrack } from '../ai/schemas'

const keyOf = (t: { artist: string; title: string }) => `${normalizeArtist(t.artist)}|${normalizeText(t.title)}`

/** Add AI results to the Missing list. Owned tracks (fuzzy match, strict on remixes) are marked 🟢. */
export async function saveDiscovered(tracks: DiscoveredTrack[], mode: MissingMode, query: string, library: (TrackRef & { id: string })[]): Promise<MissingItem[]> {
  const matcher = new Matcher(library)
  const existing = await db.missing.toArray()
  const byKey = new Map(existing.map((m) => [keyOf(m), m]))
  const out: MissingItem[] = []
  for (const t of tracks) {
    const k = keyOf(t)
    const prev = byKey.get(k)
    const hit = matcher.best({ artist: t.artist, title: t.title, remix: t.remix }, 0.85, true)
    const item: MissingItem = {
      id: prev?.id ?? uid('miss:'),
      artist: t.artist,
      title: t.title,
      remix: t.remix,
      year: t.year,
      genre: t.genre,
      estBpm: t.estBpm,
      estCamelot: t.estCamelot,
      energy: t.energy,
      why: t.why,
      mode,
      status: hit ? 'owned' : (prev?.status ?? 'missing'),
      matchedTrackId: hit?.item.id ?? prev?.matchedTrackId ?? null,
      confidence: t.confidence,
      savedAt: prev?.savedAt ?? nowIso(),
      query,
    }
    out.push(item)
  }
  await db.missing.bulkPut(out)
  return out
}

export async function setMissingStatus(id: string, status: MissingItem['status']): Promise<void> {
  await db.missing.update(id, { status })
}

export async function removeMissing(id: string): Promise<void> {
  await db.missing.delete(id)
}
