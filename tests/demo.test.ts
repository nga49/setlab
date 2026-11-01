import { describe, expect, it } from 'vitest'
import { DEMO_TRACKS } from '../src/demo/demoTracks'
import { ALL_KEYS } from '../src/engine/camelot'

describe('demo library', () => {
  it('has about 80 clearly fictional tracks', () => {
    expect(DEMO_TRACKS.length).toBeGreaterThanOrEqual(75)
    expect(DEMO_TRACKS.length).toBeLessThanOrEqual(90)
    for (const t of DEMO_TRACKS) {
      expect(t.artist).toMatch(/^Demo Artist \d\d$/)
      expect(t.title).toMatch(/^Demo Track [A-Z]+$/)
      expect(t.id).toMatch(/^demo:\d\d$/)
    }
  })

  it('covers every Camelot key', () => {
    const keys = new Set(DEMO_TRACKS.map((t) => t.camelot))
    for (const k of ALL_KEYS) expect(keys.has(k)).toBe(true)
  })

  it('spreads BPMs, genres and years', () => {
    const bpms = DEMO_TRACKS.map((t) => t.bpm!)
    expect(Math.min(...bpms)).toBeLessThan(100)
    expect(Math.max(...bpms)).toBeGreaterThan(140)
    expect(new Set(DEMO_TRACKS.map((t) => t.genre)).size).toBeGreaterThanOrEqual(12)
    const years = DEMO_TRACKS.map((t) => t.year!)
    expect(Math.min(...years)).toBeLessThan(1985)
    expect(Math.max(...years)).toBeGreaterThan(2020)
  })

  it('is deterministic and unique', () => {
    expect(new Set(DEMO_TRACKS.map((t) => t.id)).size).toBe(DEMO_TRACKS.length)
    expect(new Set(DEMO_TRACKS.map((t) => `${t.artist}|${t.title}`)).size).toBe(DEMO_TRACKS.length)
  })
})
