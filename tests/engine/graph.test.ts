import { describe, expect, it } from 'vitest'
import { EDGE_MIN, LibraryGraph } from '../../src/engine/graph'
import { mulberry32 } from '../../src/engine/random'
import { ALL_KEYS } from '../../src/engine/camelot'
import type { EngineTrack } from '../../src/engine/types'
import { CTX, demoEngine, track } from './helpers'

describe('LibraryGraph on a small hand-built graph', () => {
  // A chain of +1 moves: 8A → 9A → 10A → 11A → 12A → 1A, same BPM and genre.
  const chain = ['8A', '9A', '10A', '11A', '12A', '1A'].map((k, i) => track(`c${i}`, k, 124, 5))
  const g = new LibraryGraph(chain, CTX, 60)

  it('path finder prefers the smooth +1 chain over a direct clash', () => {
    const p = g.path('c0', 'c4')!
    expect(p.tracks.map((t) => t.id)).toEqual(['c0', 'c1', 'c2', 'c3', 'c4'])
    expect(p.intermediates).toBe(3)
    expect(p.minutes).toBe(15) // 3 × (6 min − 1 min overlap)
  })

  it('never returns more than 3 intermediates', () => {
    const p = g.path('c0', 'c5')
    if (p) expect(p.intermediates).toBeLessThanOrEqual(3)
    const p2 = g.path('c0', 'c4', { maxIntermediates: 1 })!
    expect(p2.intermediates).toBeLessThanOrEqual(1)
  })

  it('returns null for unknown or identical endpoints', () => {
    expect(g.path('c0', 'c0')).toBeNull()
    expect(g.path('nope', 'c1')).toBeNull()
  })

  it('finds the optimal path (brute force check on random small graphs)', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const rnd = mulberry32(seed)
      const lib: EngineTrack[] = Array.from({ length: 12 }, (_, i) =>
        track(`r${i}`, ALL_KEYS[Math.floor(rnd() * 24)]!, 118 + Math.floor(rnd() * 12), 3 + Math.floor(rnd() * 6)),
      )
      const gg = new LibraryGraph(lib, CTX)
      const cost = (i: number, j: number) => {
        const s = gg.edge(i, j)
        return s >= EDGE_MIN ? 100 - s : Infinity
      }
      const n = lib.length
      let best = Infinity
      const from = 0
      const to = 11
      const rec = (path: number[], c: number) => {
        const last = path[path.length - 1]!
        best = Math.min(best, c + cost(last, to))
        if (path.length - 1 >= 3) return
        for (let x = 0; x < n; x++) {
          if (x === from || x === to || path.includes(x)) continue
          const cc = c + cost(last, x)
          if (Number.isFinite(cc)) rec([...path, x], cc)
        }
      }
      rec([from], 0)
      const p = gg.path('r0', 'r11')
      if (!Number.isFinite(best)) expect(p).toBeNull()
      else expect(p!.cost).toBeCloseTo(best, 6)
    }
  })

  it('excludes played tracks from paths', () => {
    const p = g.path('c0', 'c4', { exclude: new Set(['c2']) })
    if (p) expect(p.tracks.map((t) => t.id)).not.toContain('c2')
  })
})

describe('next / before / after / bridges / fit', () => {
  const lib = demoEngine()
  const g = new LibraryGraph(lib, CTX)
  const now = lib[0]!

  it('top 5 next tracks, sorted, excluding played', () => {
    const played = new Set([now.id, lib[1]!.id])
    const next = g.nextTracks(now.id, { exclude: played })
    expect(next).toHaveLength(5)
    for (let i = 1; i < next.length; i++) expect(next[i - 1]!.score).toBeGreaterThanOrEqual(next[i]!.score)
    for (const n of next) expect(played.has(n.track.id)).toBe(false)
    expect(next[0]!.transition.reasons.length).toBeGreaterThan(2)
  })

  it('direction and same-genre filters', () => {
    const up = g.nextTracks(now.id, { direction: 'up' })
    expect(up[0]!.track.energy).toBeGreaterThanOrEqual(now.energy)
    const same = g.nextTracks(now.id, { sameGenre: true }, 3)
    for (const n of same) expect(n.track.genre).toBe(now.genre)
    expect(g.nextTracks('unknown')).toEqual([])
  })

  it('best before and after', () => {
    expect(g.bestAfter(now.id)).toHaveLength(3)
    const before = g.bestBefore(now.id)
    expect(before).toHaveLength(3)
    expect(before[0]!.transition.toId).toBe(now.id)
    expect(g.bestBefore('x')).toEqual([])
    expect(g.bestAfter('x')).toEqual([])
  })

  it('bridges between two clashing tracks', () => {
    const a = lib.find((t) => t.camelot === '8A')!
    const b = lib.find((t) => t.camelot === '2B')!
    const br = g.bridges(a.id, b.id)
    expect(br.singles).toHaveLength(3)
    expect(br.singles[0]!.min).toBeGreaterThanOrEqual(br.singles[1]!.min)
    expect(br.double).not.toBeNull()
    expect(br.double!.min).toBeGreaterThan(0)
    expect(g.bridges('x', b.id)).toEqual({ singles: [], double: null })
  })

  it('fitScore counts strong connections', () => {
    const cand = { ...track('new', now.camelot, now.bpm, now.energy, now.genre), id: 'cand' }
    expect(g.fitScore(cand)).toBeGreaterThan(0)
    expect(g.fitScore(track('odd', null, 60, 1, 'Gqom'))).toBe(0)
  })

})
