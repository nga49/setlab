import { type Arc, arcDirection, arcFit, arcPhase, arcTarget, getArc, offsetArc, positionsOf } from './arcs'
import { clamp100, colorOf, MODE_WEIGHTS, Prepared, transitionScore } from './score'
import { mulberry32 } from './random'
import type { ArcId, Direction, EngineTrack, Mode, ScoreContext, TransitionResult } from './types'

/** Set generation (docs/ENGINE.md §7). */

export const ALL_MODES: Mode[] = ['smooth', 'journey', 'keytour']

export interface GenerateOptions {
  modes?: Mode[]
  /** Arc for Journey (Smooth and Key tour use a gentle arc fitted to the pool). */
  arc: ArcId
  /** Party energy slider: shifts the arc up/down. */
  arcOffset?: number
  /** Target duration in seconds. null = use every pool track (organizer reorder). */
  targetSec: number | null
  overlapSec: number
  locks?: string[]
  pinFirst?: string | null
  pinLast?: string | null
  /** Tracks picked by the user. */
  picked?: string[]
  /** "picked": only picked tracks · "fill": picked tracks + fill from the library. */
  poolMode: 'picked' | 'fill'
  seed?: number
  ctx: ScoreContext
  /** Wall-clock cap for local improvement per mode (ms). */
  timeBudgetMs?: number
  /** Max improvement sweeps per mode (keeps results deterministic). */
  maxSweeps?: number
  beamWidth?: number
  /** Party sets: bonus points per track id (genre and era weighting). */
  trackBonus?: Map<string, number>
  /** Party sets: only these library ids may be used to fill. */
  allowed?: Set<string> | null
  maxArtistRepeats?: number
}

export interface SetResult {
  mode: Mode
  arc: Arc
  tracks: EngineTrack[]
  transitions: TransitionResult[]
  meanTransition: number
  arcFit: number
  /** mean transition × 0.7 + arc fit × 0.3 */
  total: number
  durationSec: number
  targetSec: number | null
  warnings: string[]
  phases: string[]
  targets: number[]
  positions: number[]
}

const DURATION_TOL = 0.05
const KEYTOUR_NEW_KEY = 5
const KEYTOUR_SAME_RUN = -5
const SMOOTH_DRIFT_OK = 2
const SMOOTH_DRIFT_BACK = -3

export function setDuration(lengths: number[], overlapSec: number): number {
  if (!lengths.length) return 0
  return lengths.reduce((a, b) => a + b, 0) - (lengths.length - 1) * overlapSec
}

export function directionFor(arc: Arc, positions: number[], i: number): Direction {
  return i > 0 ? arcDirection(arc, positions[i - 1]!, positions[i]!) : 'any'
}

/** Mode extras for the transition arriving at position i (key tour novelty, smooth BPM drift). */
function modeExtra(mode: Mode, p: Prepared, seq: number[], i: number): { pts: number; why: string | null } {
  if (i === 0) return { pts: 0, why: null }
  if (mode === 'keytour') {
    const k = p.key(seq[i]!)
    if (k < 0) return { pts: 0, why: null }
    let seen = false
    for (let j = 0; j < i; j++) if (p.key(seq[j]!) === k) seen = true
    let run = 1
    for (let j = i - 1; j >= 0 && p.key(seq[j]!) === k; j--) run++
    let pts = 0
    const why: string[] = []
    if (!seen) {
      pts += KEYTOUR_NEW_KEY
      why.push('new key +5')
    }
    if (run > 3) {
      pts += KEYTOUR_SAME_RUN
      why.push(`same key ×${run} −5`)
    }
    return { pts, why: why.join(' · ') || null }
  }
  if (mode === 'smooth') {
    const d = p.bpm[seq[i]!]! - p.bpm[seq[i - 1]!]!
    if (!p.bpm[seq[i]!] || !p.bpm[seq[i - 1]!] || Math.abs(d) < 0.5) return { pts: 0, why: null }
    // Drift sign = first meaningful BPM change in the set.
    let drift = 0
    for (let j = 1; j < i; j++) {
      const dj = p.bpm[seq[j]!]! - p.bpm[seq[j - 1]!]!
      if (p.bpm[seq[j]!] && p.bpm[seq[j - 1]!] && Math.abs(dj) >= 0.5) {
        drift = Math.sign(dj)
        break
      }
    }
    if (drift === 0) return { pts: 0, why: null }
    return Math.sign(d) === drift
      ? { pts: SMOOTH_DRIFT_OK, why: 'BPM drift ✓' }
      : { pts: SMOOTH_DRIFT_BACK, why: 'BPM backtrack −3' }
  }
  return { pts: 0, why: null }
}

interface Eval {
  transitions: number[]
  mean: number
  fit: number
  total: number
  duration: number
  positions: number[]
}

function evaluate(p: Prepared, seq: number[], mode: Mode, arc: Arc, overlapSec: number): Eval {
  const lengths = seq.map((i) => p.len[i]!)
  const positions = positionsOf(lengths, overlapSec)
  const w = MODE_WEIGHTS[mode]
  const transitions: number[] = []
  for (let i = 1; i < seq.length; i++) {
    const dir = directionFor(arc, positions, i)
    const s = p.score(seq[i - 1]!, seq[i]!, w, dir) + modeExtra(mode, p, seq, i).pts
    transitions.push(clamp100(s))
  }
  const mean = transitions.length ? transitions.reduce((a, b) => a + b, 0) / transitions.length : 100
  const fit = arcFit(
    seq.map((i) => p.energy[i]!),
    positions,
    arc,
  )
  return { transitions, mean, fit, total: mean * 0.7 + fit * 0.3, duration: setDuration(lengths, overlapSec), positions }
}

/** Analyse an ordered set (used for results and for live rescoring while editing). */
export function analyzeSet(
  tracks: EngineTrack[],
  opts: { mode: Mode; arc: ArcId; arcOffset?: number; overlapSec: number; ctx: ScoreContext; targetSec?: number | null; poolEnergies?: number[] },
): SetResult {
  const p = new Prepared(tracks, opts.ctx)
  const arc = offsetArc(getArc(opts.mode === 'journey' ? opts.arc : 'gentle', opts.poolEnergies ?? tracks.map((t) => t.energy)), opts.arcOffset ?? 0)
  const seq = tracks.map((_, i) => i)
  const ev = evaluate(p, seq, opts.mode, arc, opts.overlapSec)
  const w = MODE_WEIGHTS[opts.mode]
  const transitions: TransitionResult[] = []
  for (let i = 1; i < tracks.length; i++) {
    const dir = directionFor(arc, ev.positions, i)
    const tr = transitionScore(tracks[i - 1]!, tracks[i]!, opts.ctx, { weights: w, direction: dir })
    const ex = modeExtra(opts.mode, p, seq, i)
    if (ex.why) tr.reasons.push(ex.why)
    tr.score = ev.transitions[i - 1]!
    tr.color = colorOf(tr.score)
    transitions.push(tr)
  }
  return {
    mode: opts.mode,
    arc,
    tracks,
    transitions,
    meanTransition: ev.mean,
    arcFit: ev.fit,
    total: ev.total,
    durationSec: ev.duration,
    targetSec: opts.targetSec ?? null,
    warnings: [],
    phases: ev.positions.map((t) => arcPhase(arc, t)),
    targets: ev.positions.map((t) => arcTarget(arc, t)),
    positions: ev.positions,
  }
}

// ---------------------------------------------------------------------------

interface ModeConfig {
  mode: Mode
  arc: Arc
  overlap: number
  target: number | null
  min: number
  max: number
  must: Set<number>
  first: number | null
  last: number | null
  candidates: number[]
  bonus: Float64Array
  avoid: number[][]
  avoidPenalty: number
  maxArtist: number
  artistOf: string[]
  rng: () => number
  jitter: number
  beamWidth: number
  sweeps: number
  deadline: number
}

interface BeamState {
  seq: number[]
  used: Uint8Array
  elapsed: number
  sum: number
  mustLeft: number
}

function objective(p: Prepared, seq: number[], c: ModeConfig): number {
  const ev = evaluate(p, seq, c.mode, c.arc, c.overlap)
  let o = ev.total
  let b = 0
  for (const i of seq) b += c.bonus[i]!
  if (seq.length) o += b / seq.length
  if (c.target) {
    const dev = Math.abs(ev.duration - c.target) / c.target
    o -= dev > DURATION_TOL ? 50 * (dev - DURATION_TOL) + 2 : dev * 4
  }
  for (const prev of c.avoid) {
    let same = 0
    for (let i = 0; i < seq.length; i++) if (prev[i] === seq[i]) same++
    o -= (c.avoidPenalty * same) / Math.max(1, seq.length)
  }
  return o
}

function artistCount(c: ModeConfig, seq: number[], artist: string): number {
  let n = 0
  for (const i of seq) if (c.artistOf[i] === artist) n++
  return n
}

/** Beam search building the sequence step by step. */
function beamSearch(p: Prepared, c: ModeConfig): number[] {
  const w = MODE_WEIGHTS[c.mode]
  const lastLen = c.last !== null ? p.len[c.last]! - c.overlap : 0
  const mustLen = (s: BeamState) => {
    let total = 0
    for (const m of c.must) if (!s.used[m] && m !== c.last) total += p.len[m]! - c.overlap
    return total
  }
  const denom = c.target ?? setDuration(c.candidates.map((i) => p.len[i]!), c.overlap)
  const tOf = (elapsed: number, len: number) => (denom > 0 ? Math.min(1, (elapsed + len / 2) / denom) : 0)

  const stepScore = (s: BeamState, cand: number): number => {
    const pos = s.seq.length
    const start = pos === 0 ? 0 : s.elapsed - c.overlap
    const t = tOf(start, p.len[cand]!)
    const arcPoint = clamp100(100 - Math.abs(p.energy[cand]! - arcTarget(c.arc, t)) * 12)
    let v: number
    if (pos === 0) v = arcPoint
    else {
      const prev = s.seq[pos - 1]!
      const tPrev = tOf(Math.max(0, start - p.len[prev]! + c.overlap), p.len[prev]!)
      const dir: Direction = arcDirection(c.arc, tPrev, t)
      s.seq.push(cand)
      const extra = modeExtra(c.mode, p, s.seq, pos).pts
      s.seq.pop()
      v = 0.7 * clamp100(p.score(prev, cand, w, dir) + extra) + 0.3 * arcPoint
    }
    v += c.bonus[cand]!
    if (c.must.has(cand)) v += 4
    for (const prev of c.avoid) if (prev[pos] === cand) v -= c.avoidPenalty
    if (c.jitter) v += (c.rng() - 0.5) * 2 * c.jitter
    return v
  }

  const initUsed = new Uint8Array(p.n)
  let beam: BeamState[] = []
  // Pins are placed separately: they never count as locks still to place.
  let mustCount = 0
  for (const m of c.must) if (m !== c.first && m !== c.last) mustCount++
  if (c.first !== null) {
    initUsed[c.first] = 1
    beam.push({
      seq: [c.first],
      used: initUsed,
      elapsed: p.len[c.first]!,
      sum: 0,
      mustLeft: mustCount,
    })
  } else {
    beam.push({ seq: [], used: initUsed, elapsed: 0, sum: 0, mustLeft: mustCount })
  }
  if (c.last !== null) for (const s of beam) s.used[c.last] = 1

  const completed: number[][] = []
  const organizer = c.target === null
  const branch = 6
  const maxSteps = c.candidates.length + 2

  for (let step = 0; step < maxSteps && beam.length; step++) {
    const children: { parent: BeamState; cand: number; v: number }[] = []
    for (const s of beam) {
      const top: { cand: number; v: number }[] = []
      const remainingAfter = (cand: number) => {
        const e = s.seq.length === 0 ? p.len[cand]! : s.elapsed + p.len[cand]! - c.overlap
        return e
      }
      const need = organizer ? 0 : mustLen(s)
      for (const cand of c.candidates) {
        if (s.used[cand]) continue
        if (c.maxArtist > 0 && artistCount(c, s.seq, c.artistOf[cand]!) >= c.maxArtist) continue
        if (!organizer) {
          const e = remainingAfter(cand)
          if (e + lastLen > c.max) continue
          // Keep room for locked tracks that are still missing.
          if (!c.must.has(cand) && need > 0 && e + need + lastLen > c.max) continue
        }
        const v = stepScore(s, cand)
        if (top.length < branch) {
          top.push({ cand, v })
          top.sort((a, b) => b.v - a.v)
        } else if (v > top[top.length - 1]!.v) {
          top[top.length - 1] = { cand, v }
          top.sort((a, b) => b.v - a.v)
        }
      }
      for (const t of top) children.push({ parent: s, cand: t.cand, v: t.v })
    }
    if (!children.length) break
    const next: BeamState[] = children.map(({ parent, cand, v }) => {
      const used = parent.used.slice()
      used[cand] = 1
      const seq = [...parent.seq, cand]
      const elapsed = parent.seq.length === 0 ? p.len[cand]! : parent.elapsed + p.len[cand]! - c.overlap
      return { seq, used, elapsed, sum: parent.sum + v, mustLeft: parent.mustLeft - (c.must.has(cand) ? 1 : 0) }
    })
    next.sort((a, b) => b.sum / b.seq.length - a.sum / a.seq.length)
    // Keep the best states, one per (last track, length) to keep the beam varied.
    const seen = new Set<string>()
    beam = []
    for (const s of next) {
      const key = `${s.seq[s.seq.length - 1]}|${s.seq.length}`
      if (seen.has(key)) continue
      seen.add(key)
      beam.push(s)
      if (beam.length >= c.beamWidth) break
    }
    // Record completions.
    const keep: BeamState[] = []
    for (const s of beam) {
      const finalElapsed = c.last !== null ? s.elapsed + lastLen : s.elapsed
      const done = organizer
        ? s.seq.length + (c.last !== null ? 1 : 0) >= c.candidates.length + (c.first !== null ? 1 : 0) + (c.last !== null ? 1 : 0)
        : finalElapsed >= c.min && s.mustLeft === 0
      if (done) completed.push(c.last !== null ? [...s.seq, c.last] : [...s.seq])
      if (organizer ? !done : finalElapsed < (c.target ?? 0) || (s.mustLeft > 0 && finalElapsed < c.max)) keep.push(s)
    }
    beam = keep
    if (completed.length >= c.beamWidth * 4) break
  }

  if (!completed.length) return []
  let best = completed[0]!
  let bestO = -Infinity
  for (const seq of completed) {
    const o = objective(p, seq, c)
    if (o > bestO) {
      bestO = o
      best = seq
    }
  }
  return best
}

/** Deterministic local improvement: swaps, 2-opt reversals and replacements. */
function improve(p: Prepared, seq: number[], c: ModeConfig): number[] {
  let cur = seq.slice()
  let best = objective(p, cur, c)
  const fixed = (i: number) => (c.first !== null && i === 0) || (c.last !== null && i === cur.length - 1)
  const inSet = new Uint8Array(p.n)
  for (const i of cur) inSet[i] = 1
  const canReplace = c.target !== null

  for (let sweep = 0; sweep < c.sweeps; sweep++) {
    let improved = false
    const L = cur.length
    for (let i = 0; i < L; i++) {
      if (fixed(i)) continue
      for (let j = i + 1; j < L; j++) {
        if (fixed(j)) continue
        if (performance.now() > c.deadline) return cur
        // swap
        const s = cur.slice()
        ;[s[i], s[j]] = [s[j]!, s[i]!]
        let o = objective(p, s, c)
        if (o > best + 1e-9) {
          cur = s
          best = o
          improved = true
          continue
        }
        // 2-opt reversal
        if (j - i >= 2) {
          const r = cur.slice(0, i).concat(cur.slice(i, j + 1).reverse(), cur.slice(j + 1))
          o = objective(p, r, c)
          if (o > best + 1e-9) {
            cur = r
            best = o
            improved = true
          }
        }
      }
    }
    if (canReplace) {
      const w = MODE_WEIGHTS[c.mode]
      for (let i = 0; i < cur.length; i++) {
        if (fixed(i) || c.must.has(cur[i]!)) continue
        if (performance.now() > c.deadline) return cur
        const prev = i > 0 ? cur[i - 1]! : -1
        const next = i < cur.length - 1 ? cur[i + 1]! : -1
        // Shortlist the 30 best local fits.
        const short: { u: number; v: number }[] = []
        for (const u of c.candidates) {
          if (inSet[u]) continue
          if (c.maxArtist > 0 && c.artistOf[u] !== c.artistOf[cur[i]!] && artistCount(c, cur, c.artistOf[u]!) >= c.maxArtist) continue
          const v = (prev >= 0 ? p.score(prev, u, w) : 50) + (next >= 0 ? p.score(u, next, w) : 50) + c.bonus[u]!
          if (short.length < 30) {
            short.push({ u, v })
            if (short.length === 30) short.sort((a, b) => b.v - a.v)
          } else if (v > short[29]!.v) {
            short[29] = { u, v }
            short.sort((a, b) => b.v - a.v)
          }
        }
        const curDur = setDuration(cur.map((k) => p.len[k]!), c.overlap)
        for (const { u } of short) {
          // Duration window is a hard constraint for replacements.
          const d = curDur - p.len[cur[i]!]! + p.len[u]!
          if (d < c.min || d > c.max) continue
          const s = cur.slice()
          s[i] = u
          const o = objective(p, s, c)
          if (o > best + 1e-9) {
            inSet[cur[i]!] = 0
            inSet[u] = 1
            cur = s
            best = o
            improved = true
            break
          }
        }
      }
    }
    if (!improved) break
  }
  return cur
}

function positionalOverlap(a: string[], b: string[]): number {
  const L = Math.max(a.length, b.length)
  if (!L) return 0
  let same = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) same++
  return same / L
}

/**
 * Generate one set per mode (Smooth, Journey, Key tour by default).
 * Locks and pins are always respected; duration lands within ±5% when the pool allows.
 */
export function generateSets(library: EngineTrack[], o: GenerateOptions): SetResult[] {
  const modes = o.modes ?? ALL_MODES
  const picked = new Set(o.picked ?? [])
  const locks = new Set(o.locks ?? [])
  if (o.pinFirst) locks.add(o.pinFirst)
  if (o.pinLast) locks.add(o.pinLast)
  for (const l of locks) picked.add(l)

  // Pool: picked only, or picked + library fill (respecting the party filter).
  const pool: EngineTrack[] = []
  const seen = new Set<string>()
  const byId = new Map(library.map((t) => [t.id, t]))
  for (const id of picked) {
    const t = byId.get(id)
    if (t && !seen.has(id)) {
      pool.push(t)
      seen.add(id)
    }
  }
  if (o.poolMode === 'fill') {
    for (const t of library) {
      if (seen.has(t.id)) continue
      if (o.allowed && !o.allowed.has(t.id)) continue
      pool.push(t)
      seen.add(t.id)
    }
  }
  const warnings: string[] = []
  if (!pool.length) return modes.map((mode) => emptyResult(mode, o, ['No tracks to build from: pick tracks or use "fill from library".']))

  const p = new Prepared(pool, o.ctx)
  const idx = (id: string | null | undefined) => (id ? (p.index.get(id) ?? null) : null)
  const first = idx(o.pinFirst)
  let last = idx(o.pinLast)
  if (last !== null && last === first) last = null

  let target = o.targetSec
  const pickedIdx = [...picked].map((id) => p.index.get(id)).filter((x): x is number => x !== undefined)
  let poolMode = o.poolMode
  if (poolMode === 'picked' && target) {
    const total = setDuration(pickedIdx.map((i) => p.len[i]!), o.overlapSec)
    if (total < target * (1 - DURATION_TOL)) {
      warnings.push(
        `Picked tracks only cover ${Math.round(total / 60)} of ${Math.round(target / 60)} min: using all of them. Turn on "fill from library" to reach the target.`,
      )
      target = null
    }
  }
  if (poolMode === 'fill' && target) {
    const total = setDuration(pool.map((_, i) => p.len[i]!), o.overlapSec)
    if (total < target * (1 - DURATION_TOL)) {
      warnings.push(`The whole pool only covers ${Math.round(total / 60)} min: the set is shorter than the target.`)
      target = null
      poolMode = 'picked'
    }
  }

  const must = new Set<number>()
  for (const id of locks) {
    const i = p.index.get(id)
    if (i !== undefined) must.add(i)
  }
  if (poolMode === 'fill' || target === null) for (const i of pickedIdx) must.add(i)
  if (target === null && poolMode === 'picked') for (let i = 0; i < p.n; i++) must.add(i)

  const candidates: number[] = []
  for (let i = 0; i < p.n; i++) if (i !== first && i !== last) candidates.push(i)
  // In organizer mode with picked pool, only picked tracks are candidates.
  const orgCandidates = target === null ? candidates.filter((i) => must.has(i) || poolMode === 'picked') : candidates

  const bonus = new Float64Array(p.n)
  if (o.trackBonus) for (let i = 0; i < p.n; i++) bonus[i] = o.trackBonus.get(pool[i]!.id) ?? 0
  const artistOf = pool.map((t) => t.artist.toLowerCase())
  const energies = pool.map((t) => t.energy)

  const results: SetResult[] = []
  const prevSeqs: string[][] = []
  const budget = o.timeBudgetMs ?? 300
  const overallDeadline = performance.now() + budget * modes.length
  for (const mode of modes) {
    const arc = offsetArc(getArc(mode === 'journey' ? o.arc : 'gentle', energies), o.arcOffset ?? 0)
    let result: SetResult | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const cfg: ModeConfig = {
        mode,
        arc,
        overlap: o.overlapSec,
        target,
        min: target ? target * (1 - DURATION_TOL) : 0,
        max: target ? target * (1 + DURATION_TOL) : Infinity,
        must,
        first,
        last,
        candidates: orgCandidates,
        bonus,
        avoid: prevSeqs.map((s) => s.map((id) => p.index.get(id)!)),
        avoidPenalty: attempt === 0 ? 0 : attempt === 1 ? 15 : 35,
        maxArtist: o.maxArtistRepeats ?? 0,
        artistOf,
        rng: mulberry32((o.seed ?? 1) * 7919 + ALL_MODES.indexOf(mode) * 104729 + attempt),
        jitter: o.seed && o.seed !== 1 ? 2 : 0.5,
        beamWidth: o.beamWidth ?? 12,
        sweeps: o.maxSweeps ?? 6,
        deadline: Math.min(overallDeadline, performance.now() + budget),
      }
      let seq = beamSearch(p, cfg)
      const modeWarnings = [...warnings]
      if (!seq.length) {
        modeWarnings.push('Could not fit every locked track in the target duration.')
        seq = fallbackSequence(cfg)
      }
      seq = improve(p, seq, cfg)
      const tracks = seq.map((i) => pool[i]!)
      const r = analyzeSet(tracks, { mode, arc: mode === 'journey' ? o.arc : 'gentle', arcOffset: o.arcOffset, overlapSec: o.overlapSec, ctx: o.ctx, targetSec: o.targetSec, poolEnergies: energies })
      r.warnings = modeWarnings
      result = r
      const ids = tracks.map((t) => t.id)
      const tooClose = prevSeqs.some((prev) => positionalOverlap(prev, ids) > 0.5)
      if (!tooClose) break
      if (attempt === 2) result.warnings.push('Small pool: this version is close to another one.')
    }
    results.push(result!)
    prevSeqs.push(result!.tracks.map((t) => t.id))
  }
  return results
}

/** Fallback when the beam cannot satisfy the constraints: locks first, best order kept. */
function fallbackSequence(c: ModeConfig): number[] {
  const seq: number[] = []
  if (c.first !== null) seq.push(c.first)
  for (const m of c.must) if (m !== c.first && m !== c.last) seq.push(m)
  if (c.last !== null) seq.push(c.last)
  return seq.length ? seq : c.candidates.slice(0, 1)
}

function emptyResult(mode: Mode, o: GenerateOptions, warnings: string[]): SetResult {
  const arc = getArc(mode === 'journey' ? o.arc : 'gentle', [])
  return {
    mode,
    arc,
    tracks: [],
    transitions: [],
    meanTransition: 0,
    arcFit: 0,
    total: 0,
    durationSec: 0,
    targetSec: o.targetSec,
    warnings,
    phases: [],
    targets: [],
    positions: [],
  }
}
