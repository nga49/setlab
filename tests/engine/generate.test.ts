import { describe, expect, it } from 'vitest'
import { analyzeSet, generateSets, setDuration } from '../../src/engine/generate'
import type { EngineTrack } from '../../src/engine/types'
import { CTX, demoEngine } from './helpers'

const lib = demoEngine()
const club = lib.filter((t) => t.bpm! >= 115 && t.bpm! <= 132)
const ids = (r: { tracks: EngineTrack[] }) => r.tracks.map((t) => t.id)
const dur = (r: { tracks: EngineTrack[] }, overlap = 60) => setDuration(r.tracks.map((t) => t.lengthSec!), overlap)

function overlapRatio(a: string[], b: string[]) {
  let s = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) s++
  return s / Math.max(a.length, b.length)
}

describe('generateSets', () => {
  it('ACCEPT: 60-min Journey with 2 locks in < 1 s within ±5% (demo data)', () => {
    const locks = [club[4]!.id, club[20]!.id]
    const t0 = performance.now()
    const [r] = generateSets(lib, { modes: ['journey'], arc: 'full', targetSec: 3600, overlapSec: 60, locks, poolMode: 'fill', ctx: CTX })
    const ms = performance.now() - t0
    expect(ms).toBeLessThan(1000)
    for (const l of locks) expect(ids(r!)).toContain(l)
    expect(Math.abs(dur(r!) - 3600) / 3600).toBeLessThanOrEqual(0.05)
    expect(r!.durationSec).toBeCloseTo(dur(r!))
  })

  it('locks and pins are always respected in every mode, duration within ±5%', () => {
    for (const [target, seed] of [[1800, 1], [3600, 2], [5400, 3]] as const) {
      const locks = [club[7]!.id, club[30]!.id]
      const first = club[2]!.id
      const last = club[11]!.id
      const res = generateSets(lib, { arc: 'peak', targetSec: target, overlapSec: 60, locks, pinFirst: first, pinLast: last, poolMode: 'fill', ctx: CTX, seed })
      expect(res).toHaveLength(3)
      for (const r of res) {
        const s = ids(r)
        expect(s[0]).toBe(first)
        expect(s[s.length - 1]).toBe(last)
        for (const l of locks) expect(s).toContain(l)
        expect(new Set(s).size).toBe(s.length)
        expect(Math.abs(dur(r) - target) / target, `${r.mode} ${target}`).toBeLessThanOrEqual(0.05)
      }
    }
  })

  it('organizer: reorders exactly the picked tracks', () => {
    const picked = club.slice(0, 10).map((t) => t.id)
    const res = generateSets(lib, { arc: 'full', targetSec: null, overlapSec: 60, picked, poolMode: 'picked', ctx: CTX })
    for (const r of res) expect([...ids(r)].sort()).toEqual([...picked].sort())
  })

  it('picked + duration: chooses a subset within ±5%', () => {
    const picked = club.slice(0, 24).map((t) => t.id)
    const [r] = generateSets(lib, { modes: ['smooth'], arc: 'full', targetSec: 3000, overlapSec: 60, picked, poolMode: 'picked', ctx: CTX })
    for (const id of ids(r!)) expect(picked).toContain(id)
    expect(Math.abs(dur(r!) - 3000) / 3000).toBeLessThanOrEqual(0.05)
  })

  it('picked tracks too short for the target: uses all and warns', () => {
    const picked = club.slice(0, 3).map((t) => t.id)
    const [r] = generateSets(lib, { modes: ['journey'], arc: 'full', targetSec: 7200, overlapSec: 60, picked, poolMode: 'picked', ctx: CTX })
    expect(ids(r!).sort()).toEqual([...picked].sort())
    expect(r!.warnings.join(' ')).toMatch(/fill from library/)
  })

  it('fill with a tiny library shorter than the target warns', () => {
    const small = lib.slice(0, 4)
    const [r] = generateSets(small, { modes: ['journey'], arc: 'full', targetSec: 7200, overlapSec: 60, poolMode: 'fill', ctx: CTX })
    expect(r!.tracks).toHaveLength(4)
    expect(r!.warnings.length).toBeGreaterThan(0)
  })

  it('empty pool returns empty results with a warning', () => {
    const res = generateSets(lib, { arc: 'full', targetSec: 3600, overlapSec: 60, poolMode: 'picked', picked: [], ctx: CTX })
    expect(res.every((r) => r.tracks.length === 0 && r.warnings.length === 1)).toBe(true)
  })

  it('deterministic output for the same seed', () => {
    const o = { arc: 'full' as const, targetSec: 3600, overlapSec: 60, poolMode: 'fill' as const, ctx: CTX, seed: 99 }
    const a = generateSets(lib, o).map(ids)
    const b = generateSets(lib, o).map(ids)
    expect(a).toEqual(b)
  })

  it('the 3 versions are diverse (≤ 50% same tracks in the same positions)', () => {
    for (const seed of [1, 5]) {
      const res = generateSets(lib, { arc: 'full', targetSec: 3600, overlapSec: 60, poolMode: 'fill', ctx: CTX, seed })
      const s = res.map(ids)
      expect(overlapRatio(s[0]!, s[1]!)).toBeLessThanOrEqual(0.5)
      expect(overlapRatio(s[0]!, s[2]!)).toBeLessThanOrEqual(0.5)
      expect(overlapRatio(s[1]!, s[2]!)).toBeLessThanOrEqual(0.5)
    }
  })

  it('results carry scores, phases, reasons and totals', () => {
    const [r] = generateSets(lib, { modes: ['journey'], arc: 'full', targetSec: 3600, overlapSec: 60, poolMode: 'fill', ctx: CTX })
    expect(r!.phases).toHaveLength(r!.tracks.length)
    expect(r!.transitions).toHaveLength(r!.tracks.length - 1)
    expect(r!.total).toBeCloseTo(r!.meanTransition * 0.7 + r!.arcFit * 0.3)
    expect(r!.total).toBeGreaterThan(50)
    expect(r!.transitions[0]!.reasons.length).toBeGreaterThan(2)
  })

  it('key tour rewards new keys; smooth rewards monotonic BPM drift', () => {
    const t = (id: string, camelot: string, bpm: number) => ({ ...lib[0]!, id, camelot, bpm, energy: 5, genre: 'Tech House' })
    const tour = analyzeSet([t('a', '8A', 124), t('b', '9A', 124), t('c', '10A', 124)], { mode: 'keytour', arc: 'gentle', overlapSec: 60, ctx: CTX })
    expect(tour.transitions[0]!.reasons).toContain('new key +5')
    const stay = analyzeSet([t('a', '8A', 124), t('b', '8A', 124), t('c', '8A', 124), t('d', '8A', 124)], { mode: 'keytour', arc: 'gentle', overlapSec: 60, ctx: CTX })
    expect(stay.transitions[2]!.reasons.join(' ')).toContain('same key ×4 −5')
    const smooth = analyzeSet([t('a', '8A', 120), t('b', '8A', 122), t('c', '8A', 124), t('d', '8A', 121)], { mode: 'smooth', arc: 'gentle', overlapSec: 60, ctx: CTX })
    expect(smooth.transitions[1]!.reasons).toContain('BPM drift ✓')
    expect(smooth.transitions[2]!.reasons).toContain('BPM backtrack −3')
  })

  it('max artist repeats and allowed filter are respected', () => {
    const allowed = new Set(club.slice(0, 40).map((t) => t.id))
    const [r] = generateSets(lib, { modes: ['journey'], arc: 'full', targetSec: 2400, overlapSec: 60, poolMode: 'fill', allowed, maxArtistRepeats: 1, ctx: CTX })
    for (const t of r!.tracks) expect(allowed.has(t.id)).toBe(true)
    const artists = r!.tracks.map((t) => t.artist)
    expect(new Set(artists).size).toBe(artists.length)
  })
})
