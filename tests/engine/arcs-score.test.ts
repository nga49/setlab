import { describe, expect, it } from 'vitest'
import { ARC_IDS, ARCS, arcDirection, arcFit, arcPhase, arcTarget, gentleArc, getArc, offsetArc, positionsOf } from '../../src/engine/arcs'
import { buildRatingsIndex, colorOf, DEFAULT_WEIGHTS, MODE_WEIGHTS, Prepared, transitionScore } from '../../src/engine/score'
import { mulberry32 } from '../../src/engine/random'
import type { Direction } from '../../src/engine/types'
import { CTX, demoEngine, track } from './helpers'

describe('arcs', () => {
  it('Full arc control points and interpolation', () => {
    const a = ARCS.full
    expect(arcTarget(a, 0)).toBe(4)
    expect(arcTarget(a, 0.5)).toBeCloseTo(9)
    expect(arcTarget(a, 1)).toBe(6)
    expect(arcTarget(a, 1 / 12)).toBeCloseTo(4.5)
    expect(arcTarget(a, -1)).toBe(4)
    expect(arcPhase(a, 0.5)).toBe('peak')
    expect(arcPhase(a, 0.66)).toBe('release')
    expect(arcPhase(a, 0.99)).toBe('landing')
  })
  it('Opener never goes above 6; Peak-time stays 7 to 9; Tension climbs', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      expect(arcTarget(ARCS.opener, t)).toBeLessThanOrEqual(6)
      expect(arcTarget(ARCS.peak, t)).toBeGreaterThanOrEqual(7)
      expect(arcTarget(ARCS.peak, t)).toBeLessThanOrEqual(9)
    }
    let prev = 0
    for (let t = 0; t <= 1; t += 0.1) {
      const e = arcTarget(ARCS.tension, t)
      expect(e).toBeGreaterThanOrEqual(prev)
      prev = e
    }
    expect(arcTarget(ARCS.closer, 0)).toBe(7)
    expect(arcTarget(ARCS.closer, 1)).toBe(4)
    expect(ARC_IDS).toHaveLength(5)
  })
  it('directions, fit, offsets, gentle arc', () => {
    expect(arcDirection(ARCS.full, 0.3, 0.45)).toBe('up')
    expect(arcDirection(ARCS.full, 0.55, 0.65)).toBe('down')
    expect(arcDirection(ARCS.peak, 0.5, 0.52)).toBe('flat')
    expect(arcFit([4, 9, 6], [0, 0.5, 1], ARCS.full)).toBeCloseTo(100)
    expect(arcFit([9, 4, 9], [0, 0.5, 1], ARCS.full)).toBeCloseTo(48)
    expect(arcFit([10], [0], { id: 'full', label: 'x', points: [{ t: 0, e: 1, phase: 'p' }] })).toBe(0)
    expect(arcFit([], [], ARCS.full)).toBe(0)
    const up = offsetArc(ARCS.full, 2)
    expect(arcTarget(up, 0.5)).toBe(10)
    expect(offsetArc(ARCS.full, 0)).toBe(ARCS.full)
    const g = gentleArc([3, 5, 7, 9])
    expect(arcTarget(g, 0)).toBe(5)
    expect(arcTarget(g, 1)).toBe(7)
    expect(arcTarget(gentleArc([]), 0)).toBe(5)
    expect(getArc('gentle', [6, 6]).id).toBe('gentle')
    expect(getArc('peak').id).toBe('peak')
  })
  it('positions are track midpoints', () => {
    const p = positionsOf([300, 300, 300], 60)
    expect(p[0]).toBeCloseTo(150 / 780)
    expect(p[2]).toBeCloseTo((480 + 150) / 780)
    expect(positionsOf([10, 10], 60)).toEqual([0, 1])
  })
})

describe('transition score', () => {
  it('weights sum to 1 in every mode', () => {
    for (const w of [DEFAULT_WEIGHTS, ...Object.values(MODE_WEIGHTS)]) expect(w.key + w.bpm + w.energy + w.genre).toBeCloseTo(1)
  })
  it('perfect neighbour scores 100 with reasons', () => {
    const a = track('a', '8A', 124, 5)
    const b = track('b', '9A', 124.5, 6)
    const r = transitionScore(a, b, CTX, { direction: 'up' })
    expect(r.score).toBeCloseTo(100 * (0.4 * 0.95 + 0.25 + 0.2 + 0.15))
    expect(r.color).toBe('good')
    expect(r.reasons[0]).toBe('8A → 9A · +1')
    expect(r.reasons).toContain('same genre')
    expect(r.reasons).toContain('energy +1 ✓')
    expect(r.keyMove).toBe('plus1')
  })
  it('clash + far BPM is red', () => {
    const r = transitionScore(track('a', '8A', 124), track('b', '2B', 140, 5, 'Drum & Bass'), CTX)
    expect(r.color).toBe('bad')
    expect(colorOf(60)).toBe('ok')
  })
  it('keylock off shifts the key heard', () => {
    const a = track('a', '8A', 120)
    const b = track('b', '1A', 113.2) // pitched up ~6% → +1 semitone → 8A
    const off = transitionScore(a, b, { ...CTX, keylock: false })
    expect(off.reasons[0]).toContain('(pitched)')
    expect(off.parts.key).toBe(1)
    expect(transitionScore(a, b, CTX).parts.key).toBeLessThan(1)
  })
  it('personal ratings and tags', () => {
    const a = track('a', '8A', 124)
    const b = track('b', '5B', 124)
    const base = transitionScore(a, b, CTX).score
    const ratings = buildRatingsIndex([
      { fromId: 'a', toId: 'b', rating: 1, keyMove: 'clash', bpmBucket: 'b0' },
      { fromId: 'x', toId: 'y', rating: 1, keyMove: 'clash', bpmBucket: 'b0' },
    ])
    expect(ratings.pattern.get('clash|b0')).toBe(4)
    const fire = transitionScore(a, b, { ...CTX, ratings })
    expect(fire.score).toBeCloseTo(base + 8 + 4)
    expect(fire.reasons).toContain('🔥 your pick +8')
    const bad = transitionScore(a, b, { ...CTX, ratings: buildRatingsIndex([{ fromId: 'a', toId: 'b', rating: -1 }]) })
    expect(bad.score).toBeCloseTo(Math.max(0, base - 15))
    const ok = transitionScore(a, b, { ...CTX, ratings: buildRatingsIndex([{ fromId: 'a', toId: 'b', rating: 0, keyMove: 'clash', bpmBucket: 'b0' }]) })
    expect(ok.score).toBeCloseTo(base + 2 + 1)
    const tired = { ...b, tags: ['overplayed'] }
    const t = transitionScore(a, tired, { ...CTX, recent: new Set(['b']) })
    expect(t.score).toBeCloseTo(base - 11)
    expect(t.tagPenalty).toBe(-11)
  })
  it('pattern bonus is averaged and capped at ±4', () => {
    const idx = buildRatingsIndex([
      { fromId: 'a', toId: 'b', rating: -1, keyMove: 'plus1', bpmBucket: 'b1' },
      { fromId: 'c', toId: 'd', rating: 1, keyMove: 'plus1', bpmBucket: 'b1' },
      { fromId: 'e', toId: 'f', rating: -1, keyMove: 'plus1', bpmBucket: 'b1' },
    ])
    expect(idx.pattern.get('plus1|b1')).toBeCloseTo(-4 / 3)
  })
  it('fast path equals full path on random pairs (ratings, keylock off, directions)', () => {
    const lib = demoEngine()
    lib[3] = { ...lib[3]!, tags: ['overplayed'] }
    const rnd = mulberry32(7)
    const ratings = buildRatingsIndex(
      Array.from({ length: 40 }, () => {
        const a = lib[Math.floor(rnd() * lib.length)]!
        const b = lib[Math.floor(rnd() * lib.length)]!
        const t = transitionScore(a, b, CTX)
        return { fromId: a.id, toId: b.id, rating: Math.floor(rnd() * 3) - 1, keyMove: t.keyMove, bpmBucket: 'b0' }
      }),
    )
    const dirs: Direction[] = ['any', 'up', 'down', 'flat']
    for (const keylock of [true, false]) {
      const ctx = { ...CTX, keylock, ratings, recent: new Set([lib[5]!.id]) }
      const p = new Prepared(lib, ctx)
      for (let k = 0; k < 400; k++) {
        const i = Math.floor(rnd() * lib.length)
        const j = Math.floor(rnd() * lib.length)
        const dir = dirs[k % 4]!
        const w = Object.values(MODE_WEIGHTS)[k % 3]!
        expect(p.score(i, j, w, dir)).toBeCloseTo(transitionScore(lib[i]!, lib[j]!, ctx, { weights: w, direction: dir }).score, 6)
      }
    }
  })
  it('unknown fields score neutral', () => {
    const a = track('a', null, null, 5, null)
    const r = transitionScore(a, track('b', '8A', 124), CTX)
    expect(r.parts).toEqual({ key: 0.5, bpm: 0.5, energy: 1, genre: 0.5 })
  })
})
