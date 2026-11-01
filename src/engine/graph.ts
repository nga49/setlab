import { DEFAULT_WEIGHTS, Prepared, transitionScore } from './score'
import type { Direction, EngineTrack, ScoreContext, TransitionResult } from './types'

/**
 * Graph tools over the library (docs/ENGINE.md §8). Edges exist when the
 * transition score is ≥ 50; edge cost = 100 − score. Scores are computed on
 * demand from a prepared (indexed) library and memoised per pair.
 */

export const EDGE_MIN = 50
export const FIT_MIN = 75
const DEFAULT_MIN_PER_TRACK = 4 * 60

export interface NextFilters {
  direction?: Direction
  sameGenre?: boolean
  exclude?: Set<string>
}

export interface Ranked {
  track: EngineTrack
  score: number
  transition: TransitionResult
}

export interface PathResult {
  /** Full chain including from and to. */
  tracks: EngineTrack[]
  scores: number[]
  /** Sum of edge costs (100 − score). */
  cost: number
  intermediates: number
  /** Minutes until the requested track starts (intermediates only). */
  minutes: number
}

export interface BridgeResult {
  singles: { track: EngineTrack; min: number; s1: number; s2: number }[]
  double: { tracks: [EngineTrack, EngineTrack]; min: number; scores: [number, number, number] } | null
}

export class LibraryGraph {
  readonly prep: Prepared
  private memo = new Map<number, number>()

  constructor(
    readonly tracks: EngineTrack[],
    readonly ctx: ScoreContext,
    readonly overlapSec = 60,
  ) {
    this.prep = new Prepared(tracks, ctx)
  }

  indexOf(id: string): number | undefined {
    return this.prep.index.get(id)
  }

  /** Default-weight, direction-free edge score (memoised). */
  edge(i: number, j: number): number {
    if (i === j) return 0
    const k = i * this.prep.n + j
    let s = this.memo.get(k)
    if (s === undefined) {
      s = this.prep.score(i, j, DEFAULT_WEIGHTS, 'any')
      this.memo.set(k, s)
    }
    return s
  }

  private cost(i: number, j: number): number {
    const s = this.edge(i, j)
    return s >= EDGE_MIN ? 100 - s : Infinity
  }

  private rank(from: number, k: number, opts: NextFilters & { reverse?: boolean }): Ranked[] {
    const p = this.prep
    const top: { i: number; s: number }[] = []
    const ex = opts.exclude
    const fromT = this.tracks[from]!
    for (let i = 0; i < p.n; i++) {
      if (i === from) continue
      const t = this.tracks[i]!
      if (ex?.has(t.id)) continue
      if (opts.sameGenre && fromT.genre && t.genre !== fromT.genre) continue
      const s = opts.reverse
        ? p.score(i, from, DEFAULT_WEIGHTS, opts.direction ?? 'any')
        : p.score(from, i, DEFAULT_WEIGHTS, opts.direction ?? 'any')
      if (top.length < k) {
        top.push({ i, s })
        top.sort((a, b) => b.s - a.s || a.i - b.i)
      } else if (s > top[k - 1]!.s) {
        top[k - 1] = { i, s }
        top.sort((a, b) => b.s - a.s || a.i - b.i)
      }
    }
    return top.map(({ i, s }) => {
      const a = opts.reverse ? this.tracks[i]! : fromT
      const b = opts.reverse ? fromT : this.tracks[i]!
      const transition = transitionScore(a, b, this.ctx, { direction: opts.direction ?? 'any' })
      return { track: this.tracks[i]!, score: s, transition }
    })
  }

  /** Top k next tracks from `nowId`, excluding played tracks. */
  nextTracks(nowId: string, filters: NextFilters = {}, k = 5): Ranked[] {
    const i = this.indexOf(nowId)
    if (i === undefined) return []
    return this.rank(i, k, filters)
  }

  bestAfter(id: string, k = 3, exclude?: Set<string>): Ranked[] {
    const i = this.indexOf(id)
    return i === undefined ? [] : this.rank(i, k, { exclude })
  }

  bestBefore(id: string, k = 3, exclude?: Set<string>): Ranked[] {
    const i = this.indexOf(id)
    return i === undefined ? [] : this.rank(i, k, { exclude, reverse: true })
  }

  private topK(values: Float64Array, k: number, skip: (i: number) => boolean): number[] {
    const idx: number[] = []
    for (let i = 0; i < values.length; i++) if (Number.isFinite(values[i]!) && !skip(i)) idx.push(i)
    idx.sort((a, b) => values[a]! - values[b]! || a - b)
    return idx.slice(0, k)
  }

  /**
   * Best path from → to with at most `maxIntermediates` (≤ 3) tracks in between.
   * Exact bounded shortest path (layered Dijkstra / meet-in-the-middle) on libraries up
   * to 400 tracks; on larger libraries the first and last hops are limited to the 60
   * cheapest candidates, which keeps it fast and in practice optimal.
   */
  path(fromId: string, toId: string, opts: { maxIntermediates?: number; exclude?: Set<string> } = {}): PathResult | null {
    const from = this.indexOf(fromId)
    const to = this.indexOf(toId)
    if (from === undefined || to === undefined || from === to) return null
    const maxInt = Math.min(3, opts.maxIntermediates ?? 3)
    const n = this.prep.n
    const K = n <= 400 ? n : 60
    const ex = opts.exclude
    const skip = (i: number) => i === from || i === to || !!ex?.has(this.tracks[i]!.id)

    const F1 = new Float64Array(n).fill(Infinity)
    const B1 = new Float64Array(n).fill(Infinity)
    for (let i = 0; i < n; i++) {
      if (skip(i)) continue
      F1[i] = this.cost(from, i)
      B1[i] = this.cost(i, to)
    }
    let best: { seq: number[]; cost: number } | null = null
    const consider = (seq: number[], cost: number) => {
      if (!Number.isFinite(cost)) return
      if (!best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) <= 1e-9 && seq.length < best.seq.length)) best = { seq, cost }
    }
    // 0 intermediates
    consider([from, to], this.cost(from, to))
    // 1 intermediate
    if (maxInt >= 1) for (let x = 0; x < n; x++) if (!skip(x)) consider([from, x, to], F1[x]! + B1[x]!)
    const xs = this.topK(F1, K, skip)
    const zs = this.topK(B1, K, skip)
    // 2 intermediates
    if (maxInt >= 2) {
      for (const x of xs)
        for (const z of zs) {
          if (x === z) continue
          consider([from, x, z, to], F1[x]! + this.cost(x, z) + B1[z]!)
        }
    }
    // 3 intermediates: for each middle y keep the 2 best x and 2 best z (distinct ends).
    if (maxInt >= 3) {
      for (let y = 0; y < n; y++) {
        if (skip(y)) continue
        const fx: { c: number; x: number }[] = []
        for (const x of xs) {
          if (x === y) continue
          const c = F1[x]! + this.cost(x, y)
          if (!Number.isFinite(c)) continue
          fx.push({ c, x })
        }
        if (!fx.length) continue
        fx.sort((a, b) => a.c - b.c || a.x - b.x)
        const bz: { c: number; z: number }[] = []
        for (const z of zs) {
          if (z === y) continue
          const c = this.cost(y, z) + B1[z]!
          if (!Number.isFinite(c)) continue
          bz.push({ c, z })
        }
        if (!bz.length) continue
        bz.sort((a, b) => a.c - b.c || a.z - b.z)
        for (const a of fx.slice(0, 2))
          for (const b of bz.slice(0, 2)) if (a.x !== b.z) consider([from, a.x, y, b.z, to], a.c + b.c)
      }
    }
    const found = best as { seq: number[]; cost: number } | null
    if (!found) return null
    const tracks = found.seq.map((i) => this.tracks[i]!)
    const scores: number[] = []
    for (let i = 1; i < found.seq.length; i++) scores.push(this.edge(found.seq[i - 1]!, found.seq[i]!))
    const inner = tracks.slice(1, -1)
    const sec = inner.reduce((a, t) => a + (t.lengthSec ?? DEFAULT_MIN_PER_TRACK) - this.overlapSec, 0)
    return { tracks, scores, cost: found.cost, intermediates: inner.length, minutes: Math.max(0, Math.round(sec / 60)) }
  }

  /** Best single tracks X maximising min(score(a,X), score(X,b)), and the best 2-track bridge. */
  bridges(aId: string, bId: string, opts: { exclude?: Set<string>; k?: number } = {}): BridgeResult {
    const a = this.indexOf(aId)
    const b = this.indexOf(bId)
    if (a === undefined || b === undefined) return { singles: [], double: null }
    const n = this.prep.n
    const k = opts.k ?? 3
    const skip = (i: number) => i === a || i === b || !!opts.exclude?.has(this.tracks[i]!.id)
    const s1 = new Float64Array(n)
    const s2 = new Float64Array(n)
    const single: { i: number; min: number }[] = []
    for (let i = 0; i < n; i++) {
      if (skip(i)) continue
      s1[i] = this.edge(a, i)
      s2[i] = this.edge(i, b)
      single.push({ i, min: Math.min(s1[i]!, s2[i]!) })
    }
    single.sort((x, y) => y.min - x.min || x.i - y.i)
    const singles = single.slice(0, k).map(({ i, min }) => ({ track: this.tracks[i]!, min, s1: s1[i]!, s2: s2[i]! }))
    const L = n <= 400 ? n : 60
    const xs = single.map((x) => x.i).sort((x, y) => s1[y]! - s1[x]! || x - y).slice(0, L)
    const ys = single.map((x) => x.i).sort((x, y) => s2[y]! - s2[x]! || x - y).slice(0, L)
    let double: BridgeResult['double'] = null
    for (const x of xs)
      for (const y of ys) {
        if (x === y) continue
        const mid = this.edge(x, y)
        const m = Math.min(s1[x]!, mid, s2[y]!)
        if (!double || m > double.min) double = { tracks: [this.tracks[x]!, this.tracks[y]!], min: m, scores: [s1[x]!, mid, s2[y]!] }
      }
    return { singles, double }
  }

  /** For Missing tracks: how many library tracks connect with score ≥ 75 in or out. */
  fitScore(candidate: EngineTrack): number {
    const all = [candidate, ...this.tracks.filter((t) => t.id !== candidate.id)]
    const p = new Prepared(all, this.ctx)
    let count = 0
    for (let i = 1; i < p.n; i++) {
      if (p.score(0, i) >= FIT_MIN || p.score(i, 0) >= FIT_MIN) count++
    }
    return count
  }
}
