/**
 * Camelot model (docs/ENGINE.md §1). Pure, no React, no network.
 * The 24-entry table below must stay identical to sync/keys.json and
 * sync/camelot.py (a test checks all three agree).
 */

export type Letter = 'A' | 'B'
export type Camelot = `${number}${Letter}`

export interface KeyEntry {
  camelot: string
  /** Canonical musical name, sharps/flats as commonly shown by DJ software. */
  name: string
  /** Every accepted spelling (enharmonics), canonical first. */
  names: string[]
  openKey: string
}

/**
 * Camelot ↔ musical key table. A = minor, B = major.
 * Open Key: 1d = C major (8B), 1m = A minor (8A).
 */
export const KEY_TABLE: KeyEntry[] = [
  { camelot: '1A', name: 'Abm', names: ['Abm', 'G#m'], openKey: '6m' },
  { camelot: '1B', name: 'B', names: ['B', 'Cb'], openKey: '6d' },
  { camelot: '2A', name: 'Ebm', names: ['Ebm', 'D#m'], openKey: '7m' },
  { camelot: '2B', name: 'F#', names: ['F#', 'Gb'], openKey: '7d' },
  { camelot: '3A', name: 'Bbm', names: ['Bbm', 'A#m'], openKey: '8m' },
  { camelot: '3B', name: 'Db', names: ['Db', 'C#'], openKey: '8d' },
  { camelot: '4A', name: 'Fm', names: ['Fm', 'E#m'], openKey: '9m' },
  { camelot: '4B', name: 'Ab', names: ['Ab', 'G#'], openKey: '9d' },
  { camelot: '5A', name: 'Cm', names: ['Cm', 'B#m'], openKey: '10m' },
  { camelot: '5B', name: 'Eb', names: ['Eb', 'D#'], openKey: '10d' },
  { camelot: '6A', name: 'Gm', names: ['Gm'], openKey: '11m' },
  { camelot: '6B', name: 'Bb', names: ['Bb', 'A#'], openKey: '11d' },
  { camelot: '7A', name: 'Dm', names: ['Dm'], openKey: '12m' },
  { camelot: '7B', name: 'F', names: ['F', 'E#'], openKey: '12d' },
  { camelot: '8A', name: 'Am', names: ['Am'], openKey: '1m' },
  { camelot: '8B', name: 'C', names: ['C', 'B#'], openKey: '1d' },
  { camelot: '9A', name: 'Em', names: ['Em', 'Fbm'], openKey: '2m' },
  { camelot: '9B', name: 'G', names: ['G'], openKey: '2d' },
  { camelot: '10A', name: 'Bm', names: ['Bm', 'Cbm'], openKey: '3m' },
  { camelot: '10B', name: 'D', names: ['D'], openKey: '3d' },
  { camelot: '11A', name: 'F#m', names: ['F#m', 'Gbm'], openKey: '4m' },
  { camelot: '11B', name: 'A', names: ['A'], openKey: '4d' },
  { camelot: '12A', name: 'C#m', names: ['C#m', 'Dbm'], openKey: '5m' },
  { camelot: '12B', name: 'E', names: ['E', 'Fb'], openKey: '5d' },
]

const BY_CAMELOT = new Map(KEY_TABLE.map((k) => [k.camelot, k]))
const BY_MUSICAL = new Map<string, string>()
const BY_OPENKEY = new Map<string, string>()
for (const k of KEY_TABLE) {
  for (const n of k.names) BY_MUSICAL.set(n.toLowerCase(), k.camelot)
  BY_OPENKEY.set(k.openKey, k.camelot)
}

export const ALL_KEYS: string[] = KEY_TABLE.map((k) => k.camelot)

export function keyInfo(camelot: string | null | undefined): KeyEntry | null {
  return camelot ? (BY_CAMELOT.get(camelot) ?? null) : null
}

export function musicalName(camelot: string | null | undefined): string {
  return keyInfo(camelot)?.name ?? '?'
}

/** Split "8A" into [8, 'A']. Assumes a valid Camelot code. */
export function splitCamelot(c: string): [number, Letter] {
  return [parseInt(c, 10), c.slice(-1) as Letter]
}

export function makeCamelot(num: number, letter: Letter): string {
  const n = ((((num - 1) % 12) + 12) % 12) + 1
  return `${n}${letter}`
}

/**
 * Parse a key written in Camelot ("8A", "08a"), Open Key ("1m", "6d") or
 * musical notation ("Am", "A minor", "F#m", "Dbmaj", "G♯m", "B♭").
 * Returns a Camelot code or null.
 */
export function parseKey(raw: string | null | undefined): string | null {
  if (raw == null) return null
  let s = String(raw).trim()
  if (!s) return null
  s = s.replace(/♯/g, '#').replace(/♭/g, 'b').replace(/\s+/g, ' ')

  // Camelot: 1-12 + A/B
  const cam = /^0?(1[0-2]|[1-9])\s*([ab])$/i.exec(s)
  if (cam) return `${parseInt(cam[1]!, 10)}${cam[2]!.toUpperCase()}`

  // Open Key: 1-12 + m/d
  const ok = /^0?(1[0-2]|[1-9])\s*([md])$/i.exec(s)
  if (ok) return BY_OPENKEY.get(`${parseInt(ok[1]!, 10)}${ok[2]!.toLowerCase()}`) ?? null

  // Musical: note + accidental + quality
  const mus = /^([a-g])\s*(#|b)?\s*(m|min|minor|maj|major|dur|moll)?$/i.exec(s)
  if (mus) {
    const note = mus[1]!.toUpperCase()
    const acc = mus[2] ?? ''
    const q = (mus[3] ?? '').toLowerCase()
    const minor = q === 'm' || q === 'min' || q === 'minor' || q === 'moll'
    const key = `${note}${acc}${minor ? 'm' : ''}`.toLowerCase()
    return BY_MUSICAL.get(key) ?? null
  }
  return null
}

export function toOpenKey(camelot: string | null | undefined): string | null {
  return keyInfo(camelot)?.openKey ?? null
}

// ---------------------------------------------------------------------------
// Key relationships (docs/ENGINE.md §1 table)

export type KeyMove =
  | 'same'
  | 'plus1'
  | 'minus1'
  | 'relative'
  | 'diagonal'
  | 'boost2'
  | 'boost7'
  | 'diagonalDown'
  | 'clash'
  | 'unknown'

export type KeyLabel = 'perfect' | 'good' | 'boost' | 'ok' | 'clash' | 'unknown'

export interface KeyRelation {
  move: KeyMove
  label: KeyLabel
  score: number
  /** Short text for reasons, e.g. "+1", "relative", "boost +2". */
  text: string
}

const REL: Record<KeyMove, Omit<KeyRelation, 'move'>> = {
  same: { label: 'perfect', score: 1.0, text: 'same key' },
  plus1: { label: 'perfect', score: 0.95, text: '+1' },
  minus1: { label: 'perfect', score: 0.95, text: '−1' },
  relative: { label: 'perfect', score: 0.9, text: 'relative' },
  diagonal: { label: 'good', score: 0.7, text: 'diagonal' },
  boost2: { label: 'boost', score: 0.6, text: 'boost +2' },
  boost7: { label: 'boost', score: 0.55, text: 'boost +7' },
  diagonalDown: { label: 'ok', score: 0.5, text: '−1 switch' },
  clash: { label: 'clash', score: 0.1, text: 'clash' },
  unknown: { label: 'unknown', score: 0.5, text: 'key ?' },
}

/** Relationship of a move from key a to key b. */
export function keyRelation(a: string | null | undefined, b: string | null | undefined): KeyRelation {
  if (!a || !b || !BY_CAMELOT.has(a) || !BY_CAMELOT.has(b)) return { move: 'unknown', ...REL.unknown }
  const [na, la] = splitCamelot(a)
  const [nb, lb] = splitCamelot(b)
  const diff = (((nb - na) % 12) + 12) % 12 // 0..11, upward steps
  let move: KeyMove
  if (la === lb) {
    if (diff === 0) move = 'same'
    else if (diff === 1) move = 'plus1'
    else if (diff === 11) move = 'minus1'
    else if (diff === 2) move = 'boost2'
    else if (diff === 7) move = 'boost7'
    else move = 'clash'
  } else {
    if (diff === 0) move = 'relative'
    else if (diff === 1) move = 'diagonal'
    else if (diff === 11) move = 'diagonalDown'
    else move = 'clash'
  }
  return { move, ...REL[move] }
}

export function keyScore(a: string | null | undefined, b: string | null | undefined): number {
  return keyRelation(a, b).score
}

/** Wheel highlight class for a key relative to a selected key (docs/PRODUCT.md wheel). */
export type Highlight = 'selected' | 'compatible' | 'boost' | 'dim'
export function wheelHighlight(selected: string, other: string): Highlight {
  if (selected === other) return 'selected'
  const r = keyRelation(selected, other)
  if (r.move === 'plus1' || r.move === 'minus1' || r.move === 'relative') return 'compatible'
  if (r.move === 'boost2' || r.move === 'boost7') return 'boost'
  return 'dim'
}

/** Keys that mix well from a given key: same, ±1, relative (green) and boosts (orange). */
export function compatibleKeys(c: string): { green: string[]; boost: string[] } {
  const green: string[] = []
  const boost: string[] = []
  for (const k of ALL_KEYS) {
    const h = wheelHighlight(c, k)
    if (h === 'selected' || h === 'compatible') green.push(k)
    else if (h === 'boost') boost.push(k)
  }
  return { green, boost }
}

// ---------------------------------------------------------------------------
// Pitch shift awareness (§1)

/** Camelot steps for a semitone shift: +1 semitone = +7 steps. */
export function shiftCamelot(c: string, semitones: number): string {
  const [n, l] = splitCamelot(c)
  return makeCamelot(n + ((((semitones * 7) % 12) + 12) % 12), l)
}

/**
 * Key heard when a track is played at targetBpm. With keylock ON the key never moves.
 * With keylock OFF, every ~6% of tempo is ~1 semitone (12·log2 ratio, rounded).
 */
export function effectiveKey(
  track: { camelot: string | null; bpm: number | null },
  targetBpm: number | null,
  keylock: boolean,
): string | null {
  if (!track.camelot || keylock || !track.bpm || !targetBpm) return track.camelot
  const semis = Math.round(12 * Math.log2(targetBpm / track.bpm))
  if (semis === 0) return track.camelot
  return shiftCamelot(track.camelot, semis)
}

// ---------------------------------------------------------------------------
// Colours: one hue per number, A slightly darker than B (Mixed In Key style wheel).

const HUES: Record<number, number> = {
  1: 168, 2: 140, 3: 104, 4: 70, 5: 44, 6: 22, 7: 2, 8: 334, 9: 304, 10: 272, 11: 228, 12: 196,
}

function hslToHex(h: number, s: number, l: number): string {
  const sl = s / 100
  const ll = l / 100
  const a = sl * Math.min(ll, 1 - ll)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = ll - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

export const CAMELOT_COLORS: Record<string, string> = Object.fromEntries(
  ALL_KEYS.map((k) => {
    const [n, l] = splitCamelot(k)
    const hue = HUES[n]!
    return [k, l === 'B' ? hslToHex(hue, 62, 72) : hslToHex(hue, 52, 62)]
  }),
)

/** Text colour on top of a key chip (always dark ink, contrast checked in tests). */
export const CHIP_INK = '#1B120C'

export function keyColor(c: string | null | undefined): string {
  return (c && CAMELOT_COLORS[c]) || '#8A8274'
}
