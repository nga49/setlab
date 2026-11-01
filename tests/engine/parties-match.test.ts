import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESETS, eraWeight, generateParty, nostalgiaWindow, parseFreeText, presetById } from '../../src/engine/parties'
import { Matcher, matchScore, MATCH_THRESHOLD, normalizeArtist, normalizeText, parseTrackLine, parseTrackList, similarity, splitRemix } from '../../src/engine/match'
import { CTX, demoEngine } from './helpers'

describe('party presets', () => {
  it('has the 7 party types', () => {
    expect(DEFAULT_PRESETS.map((p) => p.id)).toEqual(['wedding', 'birthday', 'beach', 'club', 'houseparty', 'lounge', 'custom'])
    expect(presetById('club').emoji).toBe('🌙')
    expect(presetById('nope' as 'club').id).toBe('wedding')
  })
  it('era weighting follows crowd age', () => {
    expect(nostalgiaWindow(35, 2026)).toEqual([2006, 2016])
    expect(eraWeight(2010, 'nostalgia', 35, 2026)).toBe(1)
    expect(eraWeight(1985, 'nostalgia', 35, 2026)).toBeLessThan(0.2)
    expect(eraWeight(2025, 'nostalgia', 60, 2026)).toBeGreaterThanOrEqual(0.6)
    expect(eraWeight(2025, 'recent', 30, 2026)).toBe(1)
    expect(eraWeight(2005, 'recent', 30, 2026)).toBe(0.2)
    expect(eraWeight(1990, 'none', 30, 2026)).toBe(1)
    expect(eraWeight(null, 'nostalgia', 30, 2026)).toBe(1)
  })
  it('parses free text hints', () => {
    const h = parseFreeText('lots of 2000s R&B, no hard techno, some 80s funk')
    expect([...h.boost].sort()).toEqual(['Funk / Soul', 'R&B'])
    expect([...h.exclude]).toEqual(['Hard Techno'])
    expect(h.decades).toEqual([[2000, 2009], [1980, 1989]])
    expect(parseFreeText('without techno').exclude.has('Techno (Peak Time / Driving)')).toBe(true)
    expect(parseFreeText(undefined).boost.size).toBe(0)
  })
  it('generates a wedding set within the preset filters, with gap cards when the library is thin', () => {
    const lib = demoEngine()
    const preset = presetById('wedding')
    const r = generateParty(lib, preset, { crowdAge: 35, era: null, energy: 6, durationSec: 3600, nowYear: 2026 }, CTX, 60)
    for (const t of r.result.tracks) {
      expect(t.bpm!).toBeGreaterThanOrEqual(95)
      expect(t.bpm!).toBeLessThanOrEqual(128)
      expect(preset.genres[t.genre!]).toBeGreaterThan(0)
    }
    expect(r.allowedCount).toBeGreaterThan(10)
    for (const gap of r.gaps) expect(gap.label).toMatch(/^Missing: .*BPM$/)
  })
  it('era slider hard-filters and free text excludes', () => {
    const lib = demoEngine()
    const r = generateParty(lib, presetById('houseparty'), { crowdAge: 30, era: [2015, 2026], energy: 6, durationSec: 1800, freeText: 'no house', nowYear: 2026 }, CTX, 60)
    for (const t of r.result.tracks) {
      if (t.year != null) expect(t.year).toBeGreaterThanOrEqual(2015)
      expect(t.genre).not.toBe('House')
    }
  })
  it('custom preset allows every genre; a huge target yields end gaps', () => {
    const lib = demoEngine().slice(0, 12)
    const r = generateParty(lib, presetById('custom'), { crowdAge: 30, era: null, energy: 6, durationSec: 4 * 3600, nowYear: 2026 }, CTX, 60)
    expect(r.gaps.some((g) => g.position === r.result.tracks.length)).toBe(true)
  })
})

describe('matching and normalizing', () => {
  it('normalizes text', () => {
    expect(normalizeText('Démo Track (Original Mix) feat. Someone')).toBe('demo track')
    expect(normalizeText('Track & Field - Extended Mix')).toBe('track and field')
    expect(normalizeText(null)).toBe('')
    expect(normalizeArtist('Demo Artist B & Demo Artist A ft. C')).toBe(normalizeArtist('Demo Artist A, Demo Artist B'))
  })
  it('splits remixes', () => {
    expect(splitRemix('Demo Track K (Demo Remix A)')).toEqual({ title: 'Demo Track K', remix: 'Demo Remix A' })
    expect(splitRemix('Demo Track K (Original Mix)')).toEqual({ title: 'Demo Track K', remix: null })
    expect(splitRemix('Demo Track K')).toEqual({ title: 'Demo Track K', remix: null })
  })
  it('similarity and remix-aware match scores', () => {
    expect(similarity('', '')).toBe(1)
    expect(similarity('a', '')).toBe(0)
    const a = { artist: 'Demo Artist 07', title: 'Demo Track K' }
    expect(matchScore(a, { artist: 'demo artist 07', title: 'Demo Track K (Original Mix)' })).toBeGreaterThan(0.95)
    expect(matchScore(a, { artist: 'Demo Artist 07', title: 'Demo Track K', remix: 'Demo Remix B' })).toBeLessThan(0.95)
    expect(matchScore({ ...a, remix: 'Demo Remix A' }, { ...a, remix: 'Totally Different Dub' })).toBeLessThan(MATCH_THRESHOLD)
    expect(matchScore(a, { artist: 'Demo Artist 08', title: 'Demo Track Q' })).toBeLessThan(MATCH_THRESHOLD)
  })
  it('matches pasted lines with typos against the library', () => {
    const lib = demoEngine()
    const m = new Matcher(lib)
    expect(m.best({ artist: 'Demo Artist 01', title: 'Demo Track A' })?.item.id).toBe('demo:01')
    expect(m.best({ artist: 'demo artst 01', title: 'demo track a' })?.item.id).toBe('demo:01')
    expect(m.best({ artist: 'Nobody', title: 'Unknown Song' })).toBeNull()
  })
  it('parses list lines', () => {
    expect(parseTrackLine('01. Demo Artist 07 - Demo Track K (Demo Remix A)')).toEqual({ artist: 'Demo Artist 07', title: 'Demo Track K', remix: 'Demo Remix A' })
    expect(parseTrackLine('Demo Artist 07 · Demo Track K')).toEqual({ artist: 'Demo Artist 07', title: 'Demo Track K', remix: null })
    expect(parseTrackLine('Demo Track K by Demo Artist 07')).toEqual({ artist: 'Demo Artist 07', title: 'Demo Track K', remix: null })
    expect(parseTrackLine('Demo Artist 07\tDemo Track K')!.artist).toBe('Demo Artist 07')
    expect(parseTrackLine('   ')).toBeNull()
    expect(parseTrackLine('Just A Title')).toEqual({ artist: '', title: 'Just A Title', remix: null })
    expect(parseTrackList('a - b\n\n2) c - d\n')).toHaveLength(2)
  })
})
