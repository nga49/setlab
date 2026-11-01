import { beforeEach, describe, expect, it } from 'vitest'
import { SetlabDB } from '../src/db/db'
import { CONFIRM_THRESHOLD, explainStatus, fetchTracksJson, mergeTracksJson, SyncError, testConnection, type TracksJson, validRepo } from '../src/data/sync'
import { Matcher } from '../src/engine/match'

const rb = (id: number, title: string, artist = 'Demo Artist 01', extra: Record<string, unknown> = {}) => ({
  id: `rb:${id}`,
  artist,
  title,
  remix: null,
  genre: 'Tech House',
  bpm: 124,
  keyRaw: 'Am',
  camelot: '8A',
  lengthSec: 360,
  year: 2024,
  rating: 0,
  dateAdded: '2026-10-01',
  playlists: [],
  myTag: [],
  ...extra,
})
const payload = (tracks: ReturnType<typeof rb>[]): TracksJson => ({ schema: 1, generatedAt: '2026-11-01T21:04:00Z', source: 'pyrekordbox', rekordboxVersion: '7', count: tracks.length, tracks })

let d: SetlabDB
beforeEach(async () => {
  d = new SetlabDB(`test-${Math.random()}`)
  await d.open()
})

describe('merge rules (DATA.md §3)', () => {
  it('upserts rb tracks and marks absent ones removed', async () => {
    let r = await mergeTracksJson(payload([rb(1, 'Demo Track A'), rb(2, 'Demo Track B')]), d)
    expect(r).toMatchObject({ added: 2, removed: 0, total: 2 })
    expect(r.text).toBe('+2 new')
    r = await mergeTracksJson(payload([rb(2, 'Demo Track B', 'Demo Artist 01', { bpm: 125 }), rb(3, 'Demo Track C')]), d)
    expect(r).toMatchObject({ added: 1, updated: 1, removed: 1 })
    expect(r.text).toBe('+1 new · 1 removed')
    expect((await d.tracks.get('rb:1'))!.status).toBe('removed')
    expect((await d.tracks.get('rb:2'))!.bpm).toBe(125)
    // A removed track that comes back is active again and counts as new.
    r = await mergeTracksJson(payload([rb(1, 'Demo Track A'), rb(2, 'Demo Track B'), rb(3, 'Demo Track C')]), d)
    expect(r.added).toBe(1)
    expect((await d.tracks.get('rb:1'))!.status).toBe('active')
  })

  it('never touches overrides on re-sync', async () => {
    await mergeTracksJson(payload([rb(1, 'Demo Track A')]), d)
    await d.overrides.put({ trackId: 'rb:1', energy: 9, tags: ['banger'], updatedAt: 'x' })
    await mergeTracksJson(payload([rb(1, 'Demo Track A', 'Demo Artist 01', { genre: 'House' })]), d)
    expect(await d.overrides.get('rb:1')).toMatchObject({ energy: 9, tags: ['banger'] })
  })

  it('confirms wishlist tracks and moves overrides, ratings, history and sets to the rb id', async () => {
    await d.tracks.put({ id: 'local:w1', artist: 'Demo Artist 07', title: 'Demo Track K', remix: null, genre: null, bpm: null, camelot: null, lengthSec: null, year: null, source: 'local', status: 'wishlist' })
    await d.overrides.put({ trackId: 'local:w1', energy: 7, notes: 'loop the intro', updatedAt: 'x' })
    await d.ratings.put({ key: 'rb:5>local:w1', fromId: 'rb:5', toId: 'local:w1', rating: 1, date: 'x' })
    await d.sessions.put({ id: 's1', kind: 'live', start: '2026-10-01T20:00:00Z', plays: [{ trackId: 'local:w1', at: 'x' }], snapshots: { 'local:w1': { artist: 'a', title: 't', camelot: null, bpm: null } } })
    await d.sets.put({ id: 'set1', name: 'n', mode: 'journey', arc: 'full', trackIds: ['rb:5', 'local:w1'], items: [], locks: ['local:w1'], createdAt: 'x', updatedAt: 'x' })
    await d.missing.put({ id: 'm1', artist: 'Demo Artist 07', title: 'Demo Track K', remix: null, year: null, genre: null, estBpm: null, estCamelot: null, energy: null, mode: 'manual', status: 'pending', savedAt: 'x' })

    const r = await mergeTracksJson(payload([rb(5, 'Demo Track Q'), rb(9, 'Demo Track K (Original Mix)', 'demo artist 07')]), d)
    expect(r.confirmed).toBe(2)
    expect(r.text).toBe('+2 new · 2 wishlist tracks confirmed')
    expect(await d.tracks.get('local:w1')).toBeUndefined()
    expect(await d.overrides.get('rb:9')).toMatchObject({ energy: 7, notes: 'loop the intro' })
    expect(await d.ratings.get('rb:5>rb:9')).toBeDefined()
    expect((await d.sessions.get('s1'))!.plays[0]!.trackId).toBe('rb:9')
    const set = (await d.sets.get('set1'))!
    expect(set.trackIds).toEqual(['rb:5', 'rb:9'])
    expect(set.locks).toEqual(['rb:9'])
    expect(await d.missing.get('m1')).toMatchObject({ status: 'owned', matchedTrackId: 'rb:9' })
  })

  it('does not confirm a remix as the original (strict remix matching)', async () => {
    await d.tracks.put({ id: 'local:w2', artist: 'Demo Artist 07', title: 'Demo Track K', remix: null, genre: null, bpm: null, camelot: null, lengthSec: null, year: null, source: 'local', status: 'wishlist' })
    const r = await mergeTracksJson(payload([rb(9, 'Demo Track K (Demo Remix Z)', 'Demo Artist 07')]), d)
    expect(r.confirmed).toBe(0)
    expect(await d.tracks.get('local:w2')).toBeDefined()
  })

  it('threshold: typos match, different tracks do not', () => {
    const m = new Matcher([{ artist: 'Demo Artist 07', title: 'Demo Track K' }])
    expect(m.best({ artist: 'Demo Artst 07', title: 'Demo Track K' }, CONFIRM_THRESHOLD, true)).not.toBeNull()
    expect(m.best({ artist: 'Demo Artist 07', title: 'Demo Track Q' }, CONFIRM_THRESHOLD, true)).toBeNull()
    expect(m.best({ artist: 'Demo Artist 08', title: 'Demo Track K' }, CONFIRM_THRESHOLD, true)).toBeNull()
  })
})

describe('fetch and errors', () => {
  const ok = payload([rb(1, 'Demo Track A')])
  it('sends ETag and handles 304 / 200', async () => {
    const calls: RequestInit[] = []
    const f = (async (_url: string, init: RequestInit) => {
      calls.push(init)
      return (init.headers as Record<string, string>)['If-None-Match']
        ? new Response(null, { status: 304 })
        : new Response(JSON.stringify(ok), { status: 200, headers: { ETag: '"abc"' } })
    }) as unknown as typeof fetch
    const first = await fetchTracksJson('demo/setlab-data', 't', null, f)
    expect(first).toMatchObject({ status: 'ok', etag: '"abc"' })
    expect((calls[0]!.headers as Record<string, string>).Accept).toBe('application/vnd.github.raw+json')
    expect((calls[0]!.headers as Record<string, string>).Authorization).toBe('Bearer t')
    const second = await fetchTracksJson('demo/setlab-data', 't', '"abc"', f)
    expect(second.status).toBe('notModified')
  })
  it('explains errors in plain words', async () => {
    for (const [status, text] of [[401, 'Token expired'], [403, 'no access'], [404, 'not found']] as const) {
      const f = (async () => new Response('{}', { status })) as unknown as typeof fetch
      await expect(fetchTracksJson('a/b', 't', null, f)).rejects.toThrow(text)
    }
    const bad = (async () => new Response('{"nope":1}', { status: 200 })) as unknown as typeof fetch
    await expect(fetchTracksJson('a/b', 't', null, bad)).rejects.toThrow(/unexpected format/)
    const offline = (async () => {
      throw new TypeError('network')
    }) as unknown as typeof fetch
    await expect(fetchTracksJson('a/b', 't', null, offline)).rejects.toBeInstanceOf(SyncError)
    expect(explainStatus(500)).toMatch(/500/)
    expect(explainStatus(429)).toMatch(/rate limit/)
  })
  it('test connection', async () => {
    expect(validRepo('nico/setlab-data')).toBe(true)
    expect(validRepo('setlab-data')).toBe(false)
    expect((await testConnection('bad', 't')).ok).toBe(false)
    expect((await testConnection('a/b', '')).ok).toBe(false)
    const f = (async (url: string) =>
      url.endsWith('/a/b') ? new Response(JSON.stringify({ private: true }), { status: 200 }) : new Response('{}', { status: 404 })) as unknown as typeof fetch
    expect(await testConnection('a/b', 't', f)).toEqual({ ok: true, message: 'Connected. No tracks.json yet: run the laptop sync once.' })
    const pub = (async (url: string) =>
      url.endsWith('/a/b') ? new Response(JSON.stringify({ private: false }), { status: 200 }) : new Response('{}', { status: 200 })) as unknown as typeof fetch
    expect((await testConnection('a/b', 't', pub)).message).toMatch(/public/)
  })
})
