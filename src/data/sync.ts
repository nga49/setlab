import { z } from 'zod'
import { db, nowIso, type SetlabDB } from '../db/db'
import type { StoredTrack } from '../db/types'
import { getSettings, setSettings } from '../db/settings'
import { TRACKS_PATH } from '../config'
import { Matcher } from '../engine/match'

/** Library sync, app side (docs/SYNC.md §4, docs/DATA.md §3). */

const API = 'https://api.github.com'

const remoteTrack = z.object({
  id: z.string().regex(/^rb:/),
  artist: z.string().nullable().catch(''),
  title: z.string(),
  remix: z.string().nullable().optional(),
  album: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  genre: z.string().nullable().optional(),
  bpm: z.number().nullable().optional(),
  keyRaw: z.string().nullable().optional(),
  camelot: z.string().nullable().optional(),
  lengthSec: z.number().nullable().optional(),
  year: z.number().nullable().optional(),
  rating: z.number().nullable().optional(),
  comment: z.string().nullable().optional(),
  dateAdded: z.string().nullable().optional(),
  playlists: z.array(z.string()).optional(),
  myTag: z.array(z.string()).optional(),
})

export const tracksJsonSchema = z.object({
  schema: z.number(),
  generatedAt: z.string(),
  source: z.string(),
  rekordboxVersion: z.string().optional(),
  count: z.number(),
  tracks: z.array(remoteTrack),
})
export type TracksJson = z.infer<typeof tracksJsonSchema>

export class SyncError extends Error {}

/** Plain-words error with the fix. */
export function explainStatus(status: number): string {
  if (status === 401) return 'Token expired or wrong: add a new one in Settings › Library sync.'
  if (status === 403) return 'Token has no access: it needs Contents read access to the data repo.'
  if (status === 404) return 'Repo or tracks.json not found: check the repo name, and run the laptop sync once.'
  if (status === 429) return 'GitHub rate limit reached: try again in a few minutes.'
  return `GitHub answered ${status}: try again later.`
}

function headers(token: string, extra: Record<string, string> = {}): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...extra }
}

export function validRepo(repo: string): boolean {
  return /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repo.trim())
}

export type FetchResult = { status: 'notModified' } | { status: 'ok'; data: TracksJson; etag: string | null }

/** GET tracks.json (raw media type) with If-None-Match. */
export async function fetchTracksJson(repo: string, token: string, etag: string | null, f: typeof fetch = fetch): Promise<FetchResult> {
  let res: Response
  try {
    res = await f(`${API}/repos/${repo.trim()}/contents/${TRACKS_PATH}`, {
      headers: headers(token, { Accept: 'application/vnd.github.raw+json', ...(etag ? { 'If-None-Match': etag } : {}) }),
      cache: 'no-store',
    })
  } catch {
    throw new SyncError('Offline or GitHub unreachable: using your saved library.')
  }
  if (res.status === 304) return { status: 'notModified' }
  if (!res.ok) throw new SyncError(explainStatus(res.status))
  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new SyncError('tracks.json is damaged: run the laptop sync again.')
  }
  const parsed = tracksJsonSchema.safeParse(json)
  if (!parsed.success) throw new SyncError('tracks.json has an unexpected format: update the laptop sync tool.')
  return { status: 'ok', data: parsed.data, etag: res.headers.get('ETag') }
}

/** "Test connection" in Settings. */
export async function testConnection(repo: string, token: string, f: typeof fetch = fetch): Promise<{ ok: boolean; message: string }> {
  if (!validRepo(repo)) return { ok: false, message: 'Repo should look like your-username/setlab-data.' }
  if (!token.trim()) return { ok: false, message: 'Paste your read-only token B.' }
  try {
    const r = await f(`${API}/repos/${repo.trim()}`, { headers: headers(token, { Accept: 'application/vnd.github+json' }), cache: 'no-store' })
    if (!r.ok) return { ok: false, message: explainStatus(r.status) }
    const meta = (await r.json()) as { private?: boolean }
    const t = await f(`${API}/repos/${repo.trim()}/contents/${TRACKS_PATH}`, {
      headers: headers(token, { Accept: 'application/vnd.github.object+json' }),
      cache: 'no-store',
    })
    const priv = meta.private === false ? ' ⚠️ This repo is public: make it private.' : ''
    if (t.status === 404) return { ok: true, message: `Connected. No tracks.json yet: run the laptop sync once.${priv}` }
    if (!t.ok) return { ok: false, message: explainStatus(t.status) }
    return { ok: true, message: `Connected. tracks.json found.${priv}` }
  } catch {
    return { ok: false, message: 'No connection: check your network.' }
  }
}

export interface MergeReport {
  added: number
  updated: number
  removed: number
  confirmed: number
  total: number
  text: string
}

function toStored(r: z.infer<typeof remoteTrack>): StoredTrack {
  return {
    id: r.id,
    artist: r.artist ?? '',
    title: r.title,
    remix: r.remix ?? null,
    album: r.album ?? null,
    label: r.label ?? null,
    genre: r.genre ?? null,
    bpm: r.bpm ?? null,
    keyRaw: r.keyRaw ?? null,
    camelot: r.camelot ?? null,
    lengthSec: r.lengthSec ?? null,
    year: r.year ?? null,
    rating: r.rating ?? 0,
    comment: r.comment ?? null,
    dateAdded: r.dateAdded ?? null,
    playlists: r.playlists ?? [],
    myTag: r.myTag ?? [],
    source: 'rekordbox',
    status: 'active',
  }
}

/** Threshold for confirming wishlist / pending tracks against synced tracks (tuned in tests). */
export const CONFIRM_THRESHOLD = 0.85

/** Move every local reference from one track id to another (overrides, ratings, history, sets). */
async function moveTrackId(d: SetlabDB, from: string, to: string): Promise<void> {
  const ov = await d.overrides.get(from)
  if (ov) {
    const target = await d.overrides.get(to)
    await d.overrides.put({ ...ov, ...(target ?? {}), ...stripUndefined(ov), trackId: to })
    await d.overrides.delete(from)
  }
  const est = await d.estimates.get(from)
  if (est) {
    if (!(await d.estimates.get(to))) await d.estimates.put({ ...est, trackId: to })
    await d.estimates.delete(from)
  }
  const ratings = await d.ratings.filter((r) => r.fromId === from || r.toId === from).toArray()
  for (const r of ratings) {
    const fromId = r.fromId === from ? to : r.fromId
    const toId = r.toId === from ? to : r.toId
    await d.ratings.delete(r.key)
    await d.ratings.put({ ...r, fromId, toId, key: `${fromId}>${toId}` })
  }
  await d.sessions.toCollection().modify((s) => {
    if (!s.plays.some((p) => p.trackId === from)) return
    s.plays = s.plays.map((p) => (p.trackId === from ? { ...p, trackId: to } : p))
    if (s.snapshots?.[from]) {
      s.snapshots[to] = s.snapshots[from]!
      delete s.snapshots[from]
    }
  })
  await d.sets.toCollection().modify((s) => {
    if (!s.trackIds.includes(from)) return
    s.trackIds = s.trackIds.map((id) => (id === from ? to : id))
    s.items = s.items.map((it) => (it.trackId === from ? { ...it, trackId: to } : it))
    s.locks = s.locks.map((id) => (id === from ? to : id))
    if (s.pins?.first === from) s.pins.first = to
    if (s.pins?.last === from) s.pins.last = to
  })
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>
}

/** Apply a tracks.json to the local database (docs/DATA.md §3). */
export async function mergeTracksJson(payload: TracksJson, d: SetlabDB = db): Promise<MergeReport> {
  const incoming = payload.tracks.map(toStored)
  const incomingIds = new Set(incoming.map((t) => t.id))
  const existing = await d.tracks.where('source').equals('rekordbox').toArray()
  const existingIds = new Map(existing.map((t) => [t.id, t]))
  let added = 0
  let updated = 0
  for (const t of incoming) {
    const prev = existingIds.get(t.id)
    if (!prev || prev.status === 'removed') added++
    else updated++
  }
  const toRemove = existing.filter((t) => !incomingIds.has(t.id) && t.status !== 'removed')

  await d.transaction('rw', d.tracks, async () => {
    await d.tracks.bulkPut(incoming)
    for (const t of toRemove) await d.tracks.update(t.id, { status: 'removed' })
  })

  // Confirm wishlist tracks and pending missing items.
  const matcher = new Matcher(incoming)
  let confirmed = 0
  const wishlist = await d.tracks.where('source').equals('local').toArray()
  for (const w of wishlist) {
    const hit = matcher.best(w, CONFIRM_THRESHOLD, true)
    if (!hit) continue
    await d.transaction('rw', [d.tracks, d.overrides, d.estimates, d.ratings, d.sessions, d.sets, d.missing], async () => {
      await moveTrackId(d, w.id, hit.item.id)
      await d.missing.filter((m) => m.matchedTrackId === w.id).modify({ matchedTrackId: hit.item.id, status: 'owned' })
      await d.tracks.delete(w.id)
    })
    confirmed++
  }
  const missing = await d.missing.where('status').anyOf('pending', 'missing').toArray()
  for (const m of missing) {
    const hit = matcher.best(m, CONFIRM_THRESHOLD, true)
    if (!hit) continue
    await d.missing.update(m.id, { status: 'owned', matchedTrackId: hit.item.id })
    if (m.status === 'pending') confirmed++
  }

  const parts = [`+${added} new`]
  if (toRemove.length) parts.push(`${toRemove.length} removed`)
  if (confirmed) parts.push(`${confirmed} wishlist track${confirmed > 1 ? 's' : ''} confirmed`)
  return { added, updated, removed: toRemove.length, confirmed, total: incoming.length, text: parts.join(' · ') }
}

let running: Promise<string> | null = null

/** Fetch + merge, store status in settings. Returns the report text. Never throws. */
export function runSync(opts: { force?: boolean; f?: typeof fetch } = {}): Promise<string> {
  if (running) return running
  running = (async () => {
    const s = await getSettings()
    if (!s.dataRepo || !s.dataToken) return 'Library sync is not set up yet.'
    try {
      const r = await fetchTracksJson(s.dataRepo, s.dataToken, opts.force ? null : s.lastSyncEtag, opts.f)
      if (r.status === 'notModified') {
        await setSettings({ lastSyncAt: nowIso(), lastSyncError: null })
        return 'Up to date'
      }
      const rep = await mergeTracksJson(r.data)
      await setSettings({
        lastSyncAt: nowIso(),
        lastSyncEtag: r.etag,
        lastSyncReport: rep.text,
        lastSyncError: null,
        lastSyncCount: rep.total,
        lastSyncGeneratedAt: r.data.generatedAt,
      })
      return rep.text
    } catch (e) {
      const msg = e instanceof SyncError ? e.message : 'Sync failed: try again.'
      await setSettings({ lastSyncError: msg, lastSyncAt: s.lastSyncAt })
      return msg
    } finally {
      running = null
    }
  })()
  return running
}

/** On app open: fetch when the last fetch is older than `staleMs`. */
export async function syncIfStale(staleMs: number): Promise<void> {
  const s = await getSettings()
  if (!s.dataRepo || !s.dataToken) return
  if (s.lastSyncAt && Date.now() - Date.parse(s.lastSyncAt) < staleMs) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  await runSync()
}
