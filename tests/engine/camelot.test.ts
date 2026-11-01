import { describe, expect, it } from 'vitest'
import {
  ALL_KEYS,
  CAMELOT_COLORS,
  CHIP_INK,
  compatibleKeys,
  effectiveKey,
  keyColor,
  keyInfo,
  keyRelation,
  keyScore,
  KEY_TABLE,
  makeCamelot,
  musicalName,
  parseKey,
  shiftCamelot,
  toOpenKey,
  wheelHighlight,
} from '../../src/engine/camelot'

describe('parseKey', () => {
  it('parses all 24 Camelot codes, with zero padding and lowercase', () => {
    for (const k of ALL_KEYS) {
      expect(parseKey(k)).toBe(k)
      expect(parseKey(k.toLowerCase())).toBe(k)
      expect(parseKey(k.padStart(3, '0'))).toBe(k)
    }
  })

  it('parses all 24 musical names including every enharmonic', () => {
    for (const e of KEY_TABLE) for (const n of e.names) expect(parseKey(n)).toBe(e.camelot)
  })

  it('parses all 24 Open Key codes', () => {
    for (const e of KEY_TABLE) expect(parseKey(e.openKey)).toBe(e.camelot)
    expect(parseKey('1m')).toBe('8A')
    expect(parseKey('1d')).toBe('8B')
    expect(parseKey('06m')).toBe('1A')
  })

  it('handles spelled-out qualities, unicode accidentals and spaces', () => {
    expect(parseKey('A minor')).toBe('8A')
    expect(parseKey('A min')).toBe('8A')
    expect(parseKey('C major')).toBe('8B')
    expect(parseKey('Dbmaj')).toBe('3B')
    expect(parseKey('G♯m')).toBe('1A')
    expect(parseKey('B♭')).toBe('6B')
    expect(parseKey('  F# m ')).toBe('11A')
    expect(parseKey('C#')).toBe('3B')
    expect(parseKey('A')).toBe('11B')
    expect(parseKey('Am')).toBe('8A')
    expect(parseKey('Amoll')).toBe('8A')
  })

  it('returns null for junk', () => {
    for (const j of [null, undefined, '', '13A', '0B', 'H', 'Xm', '8C', 'hello']) expect(parseKey(j as string)).toBeNull()
  })
})

describe('key relationships (ENGINE.md §1)', () => {
  const cases: [string, string, string, number][] = [
    ['8A', '8A', 'same', 1.0],
    ['8A', '9A', 'plus1', 0.95],
    ['8A', '7A', 'minus1', 0.95],
    ['8A', '8B', 'relative', 0.9],
    ['8A', '9B', 'diagonal', 0.7],
    ['8A', '10A', 'boost2', 0.6],
    ['8A', '3A', 'boost7', 0.55],
    ['8A', '7B', 'diagonalDown', 0.5],
    ['8A', '5A', 'clash', 0.1],
    ['8A', '2B', 'clash', 0.1],
  ]
  it.each(cases)('%s → %s is %s (%f)', (a, b, move, score) => {
    const r = keyRelation(a, b)
    expect(r.move).toBe(move)
    expect(r.score).toBe(score)
    expect(keyScore(a, b)).toBe(score)
  })

  it('wraps 12 → 1 and 1 → 12', () => {
    expect(keyRelation('12A', '1A').move).toBe('plus1')
    expect(keyRelation('1B', '12B').move).toBe('minus1')
    expect(keyRelation('12A', '1B').move).toBe('diagonal')
    expect(keyRelation('11B', '1B').move).toBe('boost2')
    expect(keyRelation('6A', '1A').move).toBe('boost7')
  })

  it('unknown keys score 0.5', () => {
    expect(keyRelation(null, '8A')).toMatchObject({ move: 'unknown', score: 0.5, label: 'unknown' })
    expect(keyRelation('8A', 'zz').score).toBe(0.5)
  })
})

describe('wheel highlights', () => {
  it('8A: green same/±1/relative, orange +2/+7', () => {
    expect(wheelHighlight('8A', '8A')).toBe('selected')
    expect(compatibleKeys('8A').green.sort()).toEqual(['7A', '8A', '8B', '9A'].sort())
    expect(compatibleKeys('8A').boost.sort()).toEqual(['10A', '3A'].sort())
    expect(wheelHighlight('8A', '5B')).toBe('dim')
  })
  it('12B wraps to 1B', () => {
    expect(compatibleKeys('12B').green.sort()).toEqual(['11B', '12A', '12B', '1B'].sort())
    expect(compatibleKeys('12B').boost.sort()).toEqual(['2B', '7B'].sort())
  })
  it('1A wraps to 12A', () => {
    expect(compatibleKeys('1A').green.sort()).toEqual(['12A', '1A', '1B', '2A'].sort())
    expect(compatibleKeys('1A').boost.sort()).toEqual(['3A', '8A'].sort())
  })
})

describe('pitch shift', () => {
  it('semitone up is +7 Camelot steps', () => {
    expect(shiftCamelot('8A', 1)).toBe('3A')
    expect(shiftCamelot('8A', -1)).toBe('1A')
    expect(shiftCamelot('8B', 12)).toBe('8B')
  })
  it('keylock ON never changes the key', () => {
    expect(effectiveKey({ camelot: '8A', bpm: 120 }, 128, true)).toBe('8A')
  })
  it('keylock OFF: ~6% faster is one semitone up', () => {
    expect(effectiveKey({ camelot: '8A', bpm: 120 }, 127.2, false)).toBe('3A')
    expect(effectiveKey({ camelot: '8A', bpm: 120 }, 113.2, false)).toBe('1A')
    expect(effectiveKey({ camelot: '8A', bpm: 120 }, 121, false)).toBe('8A')
    expect(effectiveKey({ camelot: null, bpm: 120 }, 128, false)).toBeNull()
    expect(effectiveKey({ camelot: '8A', bpm: null }, 128, false)).toBe('8A')
  })
})

describe('helpers', () => {
  it('names, open key, makeCamelot', () => {
    expect(musicalName('8A')).toBe('Am')
    expect(musicalName('3B')).toBe('Db')
    expect(musicalName(null)).toBe('?')
    expect(toOpenKey('8B')).toBe('1d')
    expect(toOpenKey('x')).toBeNull()
    expect(keyInfo(undefined)).toBeNull()
    expect(makeCamelot(13, 'A')).toBe('1A')
    expect(makeCamelot(0, 'B')).toBe('12B')
  })

  it('every key has a colour with AA contrast against the chip ink', () => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
    }
    for (const k of ALL_KEYS) {
      const bg = CAMELOT_COLORS[k]!
      expect(bg).toMatch(/^#[0-9A-F]{6}$/)
      const ratio = (lum(bg) + 0.05) / (lum(CHIP_INK) + 0.05)
      expect(ratio, `${k} ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
    expect(keyColor(null)).toBe('#8A8274')
    // A is slightly darker than B
    expect(lum(CAMELOT_COLORS['8A']!)).toBeLessThan(lum(CAMELOT_COLORS['8B']!))
  })
})
