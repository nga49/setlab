import { describe, expect, it } from 'vitest'
import { bandOf, findGaps } from '../src/library/gaps'

const t = (camelot: string, bpm: number, genre = 'House') => ({ camelot, bpm, genre })

describe('gap finder', () => {
  it('finds thin zones next to busy ones when there are no sets', () => {
    const lib = [...Array(8)].map(() => t('8A', 122)).concat([...Array(6)].map(() => t('10A', 122)), [t('9A', 123)])
    const gaps = findGaps(lib, [])
    expect(gaps[0]!.camelot).toBe('9A')
    expect(gaps[0]!.label).toBe('9A at 120 to 126: only 1 track')
  })
  it('ranks by how often the zone appears in sets', () => {
    const lib = [t('8A', 122), t('3B', 128), t('3B', 129), t('3B', 130)]
    const sets = [...Array(5)].map(() => t('5A', 125, 'Techno (Peak Time / Driving)'))
    const gaps = findGaps(lib, sets)
    expect(gaps[0]).toMatchObject({ camelot: '5A', bpmFrom: 120, supply: 0, genre: 'Techno (Peak Time / Driving)' })
    expect(gaps[0]!.label).toContain('no track')
    expect(bandOf(125.9)).toBe(120)
  })
  it('ignores tracks without key or BPM and respects the limit', () => {
    expect(findGaps([{ camelot: null, bpm: null, genre: null }], [])).toEqual([])
    const lib = ['1A', '3A', '5A', '7A', '9A', '11A'].map((k) => t(k, 100))
    expect(findGaps(lib, [], { limit: 3 })).toHaveLength(3)
  })
})
