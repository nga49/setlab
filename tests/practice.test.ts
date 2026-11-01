import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/db'
import type { SavedSet } from '../src/db/types'
import { exportFileName, rekordboxId, slug, toM3u, toRekordboxXml, toText, type ExportTrack } from '../src/practice/exports'
import { rateTransition } from '../src/practice/ratings'
import { logPractice } from '../src/tabs/PracticeTab'
import { LibraryGraph } from '../src/engine/graph'
import { buildRatingsIndex } from '../src/engine/score'
import { CTX, demoEngine } from './engine/helpers'

const SET: ExportTrack[] = [
  { id: 'rb:101', artist: 'Demo Artist 01', title: 'Demo Track A', remix: null, bpm: 124, camelot: '8A', lengthSec: 372 },
  { id: 'local:x', artist: 'Demo Artist 99', title: 'Wishlist Track', remix: null, bpm: 125, camelot: '9A', lengthSec: null },
  { id: 'rb:102', artist: 'Demo Artist 02 & Demo Artist 03', title: 'Demo Track "B"', remix: 'Demo Remix', bpm: 121.5, camelot: '8B', lengthSec: 401 },
]

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('rekordbox XML export', () => {
  it('validates against the documented structure', () => {
    const { xml, skipped } = toRekordboxXml('Saturday warm-up', SET, '1')
    expect(skipped).toBe(1)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
    const root = doc.documentElement
    expect(root.tagName).toBe('DJ_PLAYLISTS')
    expect(root.getAttribute('Version')).toBe('1.0.0')
    expect(root.querySelector('PRODUCT')!.getAttribute('Name')).toBeTruthy()
    const coll = root.querySelector('COLLECTION')!
    const tracks = [...coll.querySelectorAll('TRACK')]
    expect(coll.getAttribute('Entries')).toBe(String(tracks.length))
    expect(tracks.map((t) => t.getAttribute('TrackID'))).toEqual(['101', '102'])
    expect(tracks[1]!.getAttribute('Name')).toBe('Demo Track "B" (Demo Remix)')
    expect(tracks[1]!.getAttribute('Tonality')).toBe('C')
    expect(tracks[0]!.getAttribute('AverageBpm')).toBe('124.00')
    expect(tracks[0]!.hasAttribute('Location')).toBe(false) // no file paths from the phone
    const rootNode = root.querySelector('PLAYLISTS > NODE')!
    expect(rootNode.getAttribute('Type')).toBe('0')
    expect(rootNode.getAttribute('Name')).toBe('ROOT')
    const pl = rootNode.querySelector('NODE')!
    expect(pl.getAttribute('Type')).toBe('1')
    expect(pl.getAttribute('KeyType')).toBe('0')
    const keys = [...pl.querySelectorAll('TRACK')].map((t) => t.getAttribute('Key'))
    expect(pl.getAttribute('Entries')).toBe(String(keys.length))
    for (const k of keys) expect(tracks.some((t) => t.getAttribute('TrackID') === k)).toBe(true)
  })

  it('matches the fixture the laptop tool resolves (cross-language contract)', () => {
    const { xml } = toRekordboxXml('Saturday warm-up', SET, '1')
    expect(xml).toBe(readFileSync('sync/tests/fixtures/app-export.xml', 'utf8'))
  })

  it('helpers', () => {
    expect(rekordboxId('rb:42')).toBe('42')
    expect(rekordboxId('demo:01')).toBeNull()
    expect(slug('Été à Ibiza!! 2026')).toBe('ete-a-ibiza-2026')
    expect(slug('***')).toBe('set')
    expect(exportFileName('Saturday warm-up', 'xml')).toBe('setlab-saturday-warm-up.xml')
  })
})

describe('text and M3U', () => {
  it('text: numbered list with BPM and key', () => {
    const t = toText('Set', SET)
    expect(t.split('\n')[1]).toBe('01. Demo Artist 01 - Demo Track A · 124 BPM · 8A Am')
    expect(t).toContain('03. Demo Artist 02 & Demo Artist 03 - Demo Track "B" (Demo Remix) · 122 BPM · 8B C')
  })
  it('m3u: extended header, EXTINF and rekordbox ids', () => {
    const m = toM3u('Set', SET).split('\n')
    expect(m[0]).toBe('#EXTM3U')
    expect(m).toContain('#EXTINF:372,Demo Artist 01 - Demo Track A')
    expect(m).toContain('#SETLAB-ID:rb:101')
    expect(m).toContain('#EXTINF:-1,Demo Artist 99 - Wishlist Track')
  })
})

describe('practice and ratings', () => {
  it('logs a practice session from a saved set', async () => {
    const set: SavedSet = {
      id: 'set1',
      name: 'n',
      mode: 'journey',
      arc: 'full',
      trackIds: ['a', 'b'],
      items: [
        { trackId: 'a', artist: 'x', title: 'A', remix: null, bpm: 124, camelot: '8A', lengthSec: 360 },
        { trackId: 'b', artist: 'y', title: 'B', remix: null, bpm: 125, camelot: '9A', lengthSec: 300 },
      ],
      locks: [],
      createdAt: 'x',
      updatedAt: 'x',
    }
    const s = await logPractice(set, 60)
    expect(s.kind).toBe('practice')
    expect(Date.parse(s.plays[1]!.at) - Date.parse(s.plays[0]!.at)).toBe(300_000)
    expect(await db.sessions.get(s.id)).toBeDefined()
  })

  it('ACCEPT: rating 🔥 a pair raises it in Next track results', async () => {
    const lib = demoEngine()
    const now = lib[0]!
    const before = new LibraryGraph(lib, CTX).nextTracks(now.id, {}, 40)
    const target = before[25]!.track // a mid-ranked candidate
    const rankBefore = before.findIndex((r) => r.track.id === target.id)
    await rateTransition(now, target, 1, CTX, 'loop the intro')
    const stored = await db.ratings.get(`${now.id}>${target.id}`)
    expect(stored).toMatchObject({ rating: 1, note: 'loop the intro' })
    expect(stored!.keyMove).toBeTruthy()
    const ctx = { ...CTX, ratings: buildRatingsIndex(await db.ratings.toArray()) }
    const after = new LibraryGraph(lib, ctx).nextTracks(now.id, {}, 40)
    const rankAfter = after.findIndex((r) => r.track.id === target.id)
    expect(rankAfter).toBeLessThan(rankBefore)
    expect(after[rankAfter]!.score).toBeGreaterThan(before[rankBefore]!.score)
    // 👎 pushes it down
    await rateTransition(now, target, -1, CTX)
    const ctx2 = { ...CTX, ratings: buildRatingsIndex(await db.ratings.toArray()) }
    const worse = new LibraryGraph(lib, ctx2).nextTracks(now.id, {}, 80).findIndex((r) => r.track.id === target.id)
    expect(worse).toBeGreaterThan(rankBefore)
  })
})
