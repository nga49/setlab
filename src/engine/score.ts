import { ALL_KEYS, effectiveKey, keyRelation, type KeyMove } from './camelot'
import { bpmBucket, bpmScore, bpmText } from './bpm'
import { energyScore, energyText } from './energy'
import { DEFAULT_GENRE_TABLE, GENRE_LINK_TEXT, genreRelation } from './genres'
import type {
  Direction,
  EngineTrack,
  Mode,
  RatingsIndex,
  ScoreContext,
  TransitionResult,
  Weights,
} from './types'

/** Transition score (docs/ENGINE.md §5). */

export const DEFAULT_WEIGHTS: Weights = { key: 0.4, bpm: 0.25, energy: 0.2, genre: 0.15 }

export const MODE_WEIGHTS: Record<Mode, Weights> = {
  smooth: { key: 0.45, bpm: 0.3, energy: 0.1, genre: 0.15 },
  journey: { key: 0.3, bpm: 0.2, energy: 0.35, genre: 0.15 },
  keytour: { key: 0.4, bpm: 0.2, energy: 0.2, genre: 0.2 },
}

/** Personal pair bonus: 🔥 +8 · 👌 +2 · 👎 −15. */
export const PAIR_POINTS: Record<number, number> = { 1: 8, 0: 2, [-1]: -15 }
/** Contribution of one rating to its key-move + BPM pattern (averaged, capped ±4). */
const PATTERN_POINTS: Record<number, number> = { 1: 4, 0: 1, [-1]: -4 }
export const PATTERN_CAP = 4
export const OVERPLAYED_PENALTY = -5
export const RECENT_PENALTY = -6

export function colorOf(score: number): 'good' | 'ok' | 'bad' {
  return score >= 75 ? 'good' : score >= 50 ? 'ok' : 'bad'
}

export const clamp100 = (x: number) => Math.max(0, Math.min(100, x))

export function patternKey(move: string, bucket: string): string {
  return `${move}|${bucket}`
}

/** Build lookups from stored ratings. Pattern data is recomputed from the pair when missing. */
export function buildRatingsIndex(
  ratings: { fromId: string; toId: string; rating: number; keyMove?: string; bpmBucket?: string }[],
): RatingsIndex {
  const pair = new Map<string, number>()
  const sums = new Map<string, { s: number; n: number }>()
  for (const r of ratings) {
    pair.set(`${r.fromId}>${r.toId}`, r.rating)
    if (r.keyMove && r.bpmBucket) {
      const k = patternKey(r.keyMove, r.bpmBucket)
      const cur = sums.get(k) ?? { s: 0, n: 0 }
      cur.s += PATTERN_POINTS[r.rating] ?? 0
      cur.n += 1
      sums.set(k, cur)
    }
  }
  const pattern = new Map<string, number>()
  for (const [k, { s, n }] of sums) pattern.set(k, Math.max(-PATTERN_CAP, Math.min(PATTERN_CAP, s / n)))
  return { pair, pattern }
}

export interface TransitionOptions {
  weights?: Weights
  direction?: Direction
}

/**
 * Full transition score from a to b with reasons for the UI:
 * 100 × (wKey·key + wBpm·bpm + wGenre·genre + wEnergy·energy) + personal + tags, clamped 0..100.
 */
export function transitionScore(
  a: EngineTrack,
  b: EngineTrack,
  ctx: ScoreContext,
  opts: TransitionOptions = {},
): TransitionResult {
  const w = opts.weights ?? DEFAULT_WEIGHTS
  const dir = opts.direction ?? 'any'
  const table = ctx.genres ?? DEFAULT_GENRE_TABLE
  const bKey = effectiveKey(b, a.bpm, ctx.keylock)
  const rel = keyRelation(a.camelot, bKey)
  const ks = rel.score
  const bs = bpmScore(a.bpm, b.bpm, ctx.maxPitchPct)
  const es = energyScore(a.energy, b.energy, dir)
  const g = genreRelation(a.genre, b.genre, table)
  let score = 100 * (w.key * ks + w.bpm * bs + w.energy * es + w.genre * g.score)

  const reasons: string[] = []
  reasons.push(
    a.camelot && bKey ? `${a.camelot} → ${bKey}${bKey !== b.camelot ? ' (pitched)' : ''} · ${rel.text}` : rel.text,
  )
  reasons.push(bpmText(a.bpm, b.bpm, ctx.maxPitchPct))
  reasons.push(GENRE_LINK_TEXT[g.link])
  reasons.push(energyText(a.energy, b.energy, es))

  let personal = 0
  const r = ctx.ratings
  if (r) {
    const pr = r.pair.get(`${a.id}>${b.id}`)
    if (pr !== undefined) {
      personal += PAIR_POINTS[pr] ?? 0
      reasons.push(pr === 1 ? '🔥 your pick +8' : pr === 0 ? '👌 rated +2' : '👎 rated −15')
    }
    const pat = r.pattern.get(patternKey(rel.move, bpmBucket(a.bpm, b.bpm)))
    if (pat) {
      personal += pat
      reasons.push(`your pattern ${pat > 0 ? '+' : '−'}${Math.abs(Math.round(pat * 10) / 10)}`)
    }
  }
  let tagPenalty = 0
  if (b.tags.includes('overplayed')) {
    tagPenalty += OVERPLAYED_PENALTY
    reasons.push('😴 overplayed −5')
  }
  if (ctx.recent?.has(b.id)) {
    tagPenalty += RECENT_PENALTY
    reasons.push('played recently −6')
  }
  score = clamp100(score + personal + tagPenalty)
  return {
    fromId: a.id,
    toId: b.id,
    score,
    color: colorOf(score),
    reasons,
    parts: { key: ks, bpm: bs, energy: es, genre: g.score },
    keyMove: rel.move,
    personal,
    tagPenalty,
  }
}

// ---------------------------------------------------------------------------
// Fast path for hot loops (set generation, graph search). Same maths, indexed.

const KEY_MOVES: (KeyMove | 'unknown')[] = [
  'same',
  'plus1',
  'minus1',
  'relative',
  'diagonal',
  'boost2',
  'boost7',
  'diagonalDown',
  'clash',
  'unknown',
]
const MOVE_INDEX = new Map(KEY_MOVES.map((m, i) => [m, i]))
const BUCKETS = ['b0', 'b1', 'b2', 'b3', 'b?']
const BUCKET_INDEX = new Map(BUCKETS.map((b, i) => [b, i]))
const KEY_INDEX = new Map(ALL_KEYS.map((k, i) => [k, i]))
const KEY_SCORE = new Float64Array(24 * 24)
const KEY_MOVE = new Int8Array(24 * 24)
for (let i = 0; i < 24; i++) {
  for (let j = 0; j < 24; j++) {
    const r = keyRelation(ALL_KEYS[i], ALL_KEYS[j])
    KEY_SCORE[i * 24 + j] = r.score
    KEY_MOVE[i * 24 + j] = MOVE_INDEX.get(r.move)!
  }
}
const UNKNOWN_MOVE = MOVE_INDEX.get('unknown')!

/** Shift a key index (0..23, ordered 1A,1B,2A,...) by semitones: +1 semitone = +7 Camelot steps. */
function shiftKeyIndex(k: number, semis: number): number {
  const num = k >> 1
  const letter = k & 1
  const steps = (((semis * 7) % 12) + 12) % 12
  return (((num + steps) % 12) << 1) | letter
}

/**
 * Indexed view of a list of tracks for fast scoring. Build once per generation
 * or per library change (graph cache).
 */
export class Prepared {
  readonly n: number
  readonly index = new Map<string, number>()
  readonly keyIdx: Int8Array
  readonly bpm: Float64Array
  readonly energy: Float64Array
  readonly len: Float64Array
  readonly arrive: Float64Array
  readonly genreId: Int16Array
  private readonly genreScores: Float64Array
  private readonly G: number
  private readonly pair = new Map<number, number>()
  private readonly pattern = new Float64Array(KEY_MOVES.length * BUCKETS.length)
  private readonly hasPersonal: boolean

  constructor(
    readonly tracks: EngineTrack[],
    readonly ctx: ScoreContext,
    defaultLengthSec = 240,
  ) {
    const n = tracks.length
    this.n = n
    this.keyIdx = new Int8Array(n)
    this.bpm = new Float64Array(n)
    this.energy = new Float64Array(n)
    this.len = new Float64Array(n)
    this.arrive = new Float64Array(n)
    this.genreId = new Int16Array(n)
    const genreIds = new Map<string, number>()
    const genreNames: string[] = []
    for (let i = 0; i < n; i++) {
      const t = tracks[i]!
      this.index.set(t.id, i)
      this.keyIdx[i] = t.camelot ? (KEY_INDEX.get(t.camelot) ?? -1) : -1
      this.bpm[i] = t.bpm ?? 0
      this.energy[i] = t.energy
      this.len[i] = t.lengthSec && t.lengthSec > 0 ? t.lengthSec : defaultLengthSec
      let pen = 0
      if (t.tags.includes('overplayed')) pen += OVERPLAYED_PENALTY
      if (ctx.recent?.has(t.id)) pen += RECENT_PENALTY
      this.arrive[i] = pen
      if (t.genre) {
        let g = genreIds.get(t.genre)
        if (g === undefined) {
          g = genreNames.length
          genreIds.set(t.genre, g)
          genreNames.push(t.genre)
        }
        this.genreId[i] = g
      } else this.genreId[i] = -1
    }
    const G = genreNames.length
    this.G = G
    this.genreScores = new Float64Array(G * G)
    const table = ctx.genres ?? DEFAULT_GENRE_TABLE
    for (let a = 0; a < G; a++)
      for (let b = 0; b < G; b++) this.genreScores[a * G + b] = genreRelation(genreNames[a], genreNames[b], table).score

    const r = ctx.ratings
    if (r) {
      for (const [k, v] of r.pair) {
        const [from, to] = k.split('>')
        const i = this.index.get(from!)
        const j = this.index.get(to!)
        if (i !== undefined && j !== undefined) this.pair.set(i * n + j, PAIR_POINTS[v] ?? 0)
      }
      for (const [k, v] of r.pattern) {
        const [m, b] = k.split('|')
        const mi = MOVE_INDEX.get(m as KeyMove)
        const bi = BUCKET_INDEX.get(b!)
        if (mi !== undefined && bi !== undefined) this.pattern[mi * BUCKETS.length + bi] = v
      }
    }
    this.hasPersonal = !!r && (r.pair.size > 0 || r.pattern.size > 0)
  }

  keyPart(i: number, j: number): { score: number; move: number } {
    const ki = this.keyIdx[i]!
    let kj = this.keyIdx[j]!
    if (ki < 0 || kj < 0) return { score: 0.5, move: UNKNOWN_MOVE }
    if (!this.ctx.keylock) {
      const bi = this.bpm[i]!
      const bj = this.bpm[j]!
      if (bi > 0 && bj > 0) {
        const semis = Math.round(12 * Math.log2(bi / bj))
        if (semis !== 0) kj = shiftKeyIndex(kj, semis)
      }
    }
    return { score: KEY_SCORE[ki * 24 + kj]!, move: KEY_MOVE[ki * 24 + kj]! }
  }

  /** Numeric transition score from track i to track j (same result as transitionScore). */
  score(i: number, j: number, w: Weights = DEFAULT_WEIGHTS, dir: Direction = 'any'): number {
    const kp = this.keyPart(i, j)
    const bs = bpmScore(this.bpm[i], this.bpm[j], this.ctx.maxPitchPct)
    const es = energyScore(this.energy[i]!, this.energy[j]!, dir)
    const gi = this.genreId[i]!
    const gj = this.genreId[j]!
    const gs = gi < 0 || gj < 0 ? 0.5 : this.genreScores[gi * this.G + gj]!
    let s = 100 * (w.key * kp.score + w.bpm * bs + w.energy * es + w.genre * gs) + this.arrive[j]!
    if (this.hasPersonal) {
      s += this.pair.get(i * this.n + j) ?? 0
      const bucket = BUCKET_INDEX.get(bpmBucket(this.bpm[i] || null, this.bpm[j] || null))!
      s += this.pattern[kp.move * BUCKETS.length + bucket]!
    }
    return s < 0 ? 0 : s > 100 ? 100 : s
  }

  /** Key index (0..23) or -1, for mode extras. */
  key(i: number): number {
    return this.keyIdx[i]!
  }
}
