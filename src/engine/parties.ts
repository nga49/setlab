import { arcDirection, arcTarget } from './arcs'
import { keyInfo, makeCamelot, splitCamelot } from './camelot'
import { generateSets, type SetResult } from './generate'
import { DEFAULT_GENRE_TABLE, normalizeGenre, type GenreTable } from './genres'
import { MODE_WEIGHTS, Prepared } from './score'
import type { ArcId, EngineTrack, ScoreContext } from './types'

/** Party presets (docs/ENGINE.md §9). Editable in Settings (advanced). */

export type PartyId = 'wedding' | 'birthday' | 'beach' | 'club' | 'houseparty' | 'lounge' | 'custom'
export type EraMode = 'nostalgia' | 'recent' | 'none'

export interface PartyPreset {
  id: PartyId
  label: string
  emoji: string
  /** Allowed genres with weights 0..1 (missing genre = not allowed). */
  genres: Record<string, number>
  bpm: [number, number]
  arc: Exclude<ArcId, 'gentle'>
  eraMode: EraMode
  maxArtistRepeats: number
  /** Energy slider value at which the arc is used as-is. */
  defaultEnergy: number
  /** Word used on gap cards ("2000s party anthem"). */
  noun: string
}

const OPEN = { Pop: 1, '2000s': 1, '90s': 0.9, 'Dance / EDM': 0.8, 'Funk / Soul': 0.9, 'R&B': 0.8, 'Hip-Hop': 0.6, Latin: 0.7, Reggaeton: 0.5, Rock: 0.6 }

export const DEFAULT_PRESETS: PartyPreset[] = [
  {
    id: 'wedding',
    label: 'Wedding',
    emoji: '🍾',
    genres: { ...OPEN, House: 0.8, 'Nu Disco / Disco': 1, 'Deep House': 0.4, 'Tech House': 0.4, 'Afro House': 0.5, 'Indie Dance': 0.5 },
    bpm: [95, 128],
    arc: 'full',
    eraMode: 'nostalgia',
    maxArtistRepeats: 2,
    defaultEnergy: 6,
    noun: 'party anthem',
  },
  {
    id: 'birthday',
    label: 'Birthday',
    emoji: '🎂',
    genres: { ...OPEN, House: 0.9, 'Nu Disco / Disco': 0.9, 'Tech House': 0.6, 'Afro House': 0.6, 'Indie Dance': 0.6, 'Bass House': 0.4 },
    bpm: [95, 130],
    arc: 'full',
    eraMode: 'nostalgia',
    maxArtistRepeats: 2,
    defaultEnergy: 7,
    noun: 'singalong',
  },
  {
    id: 'beach',
    label: 'Beach / pool',
    emoji: '🏖️',
    genres: {
      'Afro House': 1,
      'Organic House / Downtempo': 1,
      'Deep House': 1,
      House: 0.8,
      'Nu Disco / Disco': 0.9,
      Amapiano: 0.8,
      Latin: 0.6,
      'Melodic House & Techno': 0.6,
      'Indie Dance': 0.6,
      Pop: 0.4,
    },
    bpm: [108, 126],
    arc: 'tension',
    eraMode: 'recent',
    maxArtistRepeats: 2,
    defaultEnergy: 5,
    noun: 'sunset groove',
  },
  {
    id: 'club',
    label: 'Club',
    emoji: '🌙',
    genres: {
      'Tech House': 1,
      House: 0.9,
      'Techno (Peak Time / Driving)': 1,
      'Techno (Raw / Deep / Hypnotic)': 0.9,
      'Melodic House & Techno': 0.9,
      'Progressive House': 0.8,
      'Afro House': 0.8,
      'Minimal / Deep Tech': 0.8,
      'Bass House': 0.8,
      'Deep House': 0.6,
      'Hard Techno': 0.5,
      'Indie Dance': 0.6,
      'Trance (Main Floor)': 0.5,
    },
    bpm: [120, 140],
    arc: 'peak',
    eraMode: 'recent',
    maxArtistRepeats: 2,
    defaultEnergy: 8,
    noun: 'peak-time weapon',
  },
  {
    id: 'houseparty',
    label: 'House party',
    emoji: '🏠',
    genres: {
      House: 1,
      'Nu Disco / Disco': 1,
      'Indie Dance': 0.8,
      'Deep House': 0.8,
      'Tech House': 0.8,
      'Afro House': 0.8,
      Pop: 0.6,
      '2000s': 0.7,
      '90s': 0.7,
      'Funk / Soul': 0.8,
      'Hip-Hop': 0.6,
      'R&B': 0.6,
      'Dance / EDM': 0.6,
    },
    bpm: [100, 128],
    arc: 'full',
    eraMode: 'nostalgia',
    maxArtistRepeats: 2,
    defaultEnergy: 6,
    noun: 'crowd pleaser',
  },
  {
    id: 'lounge',
    label: 'Lounge / dinner',
    emoji: '🍸',
    genres: {
      'Organic House / Downtempo': 1,
      'Deep House': 1,
      'Nu Disco / Disco': 0.8,
      'Funk / Soul': 0.9,
      'R&B': 0.7,
      'Melodic House & Techno': 0.4,
      'Afro House': 0.6,
      'Indie Dance': 0.6,
      Pop: 0.3,
    },
    bpm: [90, 122],
    arc: 'opener',
    eraMode: 'none',
    maxArtistRepeats: 2,
    defaultEnergy: 3,
    noun: 'lounge groove',
  },
  {
    id: 'custom',
    label: 'Custom',
    emoji: '✏️',
    genres: {},
    bpm: [60, 180],
    arc: 'full',
    eraMode: 'none',
    maxArtistRepeats: 2,
    defaultEnergy: 6,
    noun: 'track',
  },
]

export interface PartyOptions {
  crowdAge: number
  /** Hard era filter [from, to] (years), or null for no filter. */
  era: [number, number] | null
  energy: number
  durationSec: number
  freeText?: string
  /** Current year (for era weighting); injectable for tests. */
  nowYear?: number
}

/** Nostalgia window: the years the median guest was 15 to 25. */
export function nostalgiaWindow(crowdAge: number, nowYear: number): [number, number] {
  return [nowYear - crowdAge + 15, nowYear - crowdAge + 25]
}

export function eraWeight(year: number | null, mode: EraMode, crowdAge: number, nowYear: number): number {
  if (mode === 'none' || year == null) return 1
  const age = nowYear - year
  if (mode === 'recent') return age <= 3 ? 1 : Math.max(0.2, Math.exp(-(((age - 3) / 6) ** 2)))
  const [a, b] = nostalgiaWindow(crowdAge, nowYear)
  let w = year >= a && year <= b ? 1 : Math.exp(-(((year < a ? a - year : year - b) / 8) ** 2))
  if (age <= 3) w = Math.max(w, 0.6) // current hits work for everyone
  return Math.max(0.1, w)
}

export interface FreeTextHints {
  boost: Set<string>
  exclude: Set<string>
  decades: [number, number][]
}

/** Light offline parser for "lots of 2000s R&B, no hard techno". */
export function parseFreeText(text: string | undefined, table: GenreTable = DEFAULT_GENRE_TABLE): FreeTextHints {
  const out: FreeTextHints = { boost: new Set(), exclude: new Set(), decades: [] }
  if (!text) return out
  const s = ` ${text.toLowerCase().replace(/[,;.!?]+/g, ' , ')} `
  for (const m of s.matchAll(/\b(19|20)?(\d)0'?s\b/g)) {
    const century = m[1] ? Number(m[1]) * 100 : Number(m[2]) >= 5 ? 1900 : 2000
    const from = century + Number(m[2]) * 10
    out.decades.push([from, from + 9])
  }
  const names = new Map<string, string>()
  // Decade-named genres ("2000s") are handled by the decade parser above.
  for (const f of table.families) for (const g of f.genres) if (!/^\d/.test(g)) names.set(g.toLowerCase(), g)
  for (const [alias, g] of Object.entries(table.aliases)) if (!/^\d/.test(alias) && alias.length > 2) names.set(alias, g)
  const sorted = [...names.keys()].sort((a, b) => b.length - a.length)
  let rest = s
  for (const name of sorted) {
    const re = new RegExp(`(^|[^a-z])(${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[^a-z]|$)`, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(rest))) {
      const before = rest.slice(Math.max(0, m.index - 16), m.index + m[1]!.length)
      const genre = names.get(name)!
      if (/\b(no|not|without|avoid|except|zero|pas de|sans)\s+(\w+\s+)?$/.test(before)) out.exclude.add(genre)
      else out.boost.add(genre)
      rest = rest.slice(0, m.index + m[1]!.length) + ' '.repeat(name.length) + rest.slice(m.index + m[0].length)
      re.lastIndex = 0
    }
  }
  for (const g of out.exclude) out.boost.delete(g)
  return out
}

export interface Gap {
  /** Insert the gap card before this track index. */
  position: number
  phase: string
  targetCamelot: string | null
  targetBpm: number | null
  genre: string | null
  era: [number, number] | null
  label: string
}

export interface PartyResult {
  result: SetResult
  gaps: Gap[]
  allowedCount: number
}

function decadeLabel(range: [number, number] | null): string {
  if (!range) return ''
  const mid = Math.round((range[0] + range[1]) / 2)
  const dec = Math.floor(mid / 10) * 10
  return dec >= 2000 ? `${dec}s` : `${String(dec).slice(2)}s`
}

/** Party set from the library with genre and era filters and the preset arc. */
export function generateParty(
  library: EngineTrack[],
  preset: PartyPreset,
  o: PartyOptions,
  ctx: ScoreContext,
  overlapSec: number,
  seed = 1,
): PartyResult {
  const nowYear = o.nowYear ?? new Date().getFullYear()
  const table = ctx.genres ?? DEFAULT_GENRE_TABLE
  const hints = parseFreeText(o.freeText, table)
  const weights: Record<string, number> = { ...preset.genres }
  if (preset.id === 'custom') for (const f of table.families) for (const g of f.genres) weights[g] ??= 0.6
  for (const g of hints.boost) weights[g] = Math.max(weights[g] ?? 0, 1)
  for (const g of hints.exclude) weights[g] = 0

  const allowed = new Set<string>()
  const bonus = new Map<string, number>()
  for (const t of library) {
    const g = t.genre ? normalizeGenre(t.genre, table) : null
    const gw = g ? (weights[g] ?? 0) : 0.3
    if (gw <= 0) continue
    if (t.bpm && (t.bpm < preset.bpm[0] || t.bpm > preset.bpm[1])) continue
    if (o.era && t.year != null && (t.year < o.era[0] || t.year > o.era[1])) continue
    let ew = eraWeight(t.year, preset.eraMode, o.crowdAge, nowYear)
    if (hints.decades.length && t.year != null && hints.decades.some(([a, b]) => t.year! >= a && t.year! <= b)) ew = Math.min(1.5, ew + 0.5)
    allowed.add(t.id)
    let b = 10 * (gw * ew - 0.5)
    if (g && hints.boost.has(g)) b += 2
    bonus.set(t.id, b)
  }

  const [result] = generateSets(library, {
    modes: ['journey'],
    arc: preset.arc,
    arcOffset: o.energy - preset.defaultEnergy,
    targetSec: o.durationSec,
    overlapSec,
    poolMode: 'fill',
    picked: [],
    allowed,
    trackBonus: bonus,
    maxArtistRepeats: preset.maxArtistRepeats,
    ctx,
    seed,
  })
  const r = result!

  // Gap cards: positions where fewer than 2 allowed candidates would work (🟢/🟡).
  const gaps: Gap[] = []
  const pool = library.filter((t) => allowed.has(t.id))
  const inSet = new Set(r.tracks.map((t) => t.id))
  const p = new Prepared([...r.tracks, ...pool.filter((t) => !inSet.has(t.id))], ctx)
  const w = MODE_WEIGHTS.journey
  const topGenre =
    Object.entries(weights)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const eraRange =
    o.era ?? (hints.decades[0] ?? (preset.eraMode === 'nostalgia' ? nostalgiaWindow(o.crowdAge, nowYear) : null))
  const label = (phase: string, key: string | null, bpm: number | null) => {
    const era = decadeLabel(eraRange)
    const noun = /peak|climax|anthem/.test(phase) ? preset.noun : phase === 'warm-up' ? 'warm-up groove' : phase === 'release' || phase === 'breather' ? 'breather' : preset.noun
    return `Missing: ${era ? `${era} ` : ''}${noun}, ~${key ?? '?'}, ${bpm ? Math.round(bpm) : '?'} BPM`
  }
  const nextKey = (from: string | null, dir: string) => {
    if (!from || !keyInfo(from)) return null
    const [n, l] = splitCamelot(from)
    return dir === 'up' ? makeCamelot(n + 1, l) : dir === 'down' ? makeCamelot(n - 1, l) : from
  }
  for (let i = 1; i < r.tracks.length; i++) {
    const prevIdx = i - 1
    const dir = arcDirection(r.arc, r.positions[i - 1]!, r.positions[i]!)
    const target = arcTarget(r.arc, r.positions[i]!)
    let ok = 0
    for (let c = r.tracks.length; c < p.n && ok < 2; c++) {
      if (p.score(prevIdx, c, w, dir) >= 50 && Math.abs(p.energy[c]! - target) <= 2) ok++
    }
    // The chosen track counts as a candidate when it works.
    if (r.transitions[i - 1]!.score >= 50 && Math.abs(r.tracks[i]!.energy - target) <= 2) ok++
    if (ok < 2 && r.transitions[i - 1]!.score < 75) {
      const prev = r.tracks[i - 1]!
      const key = nextKey(prev.camelot, dir)
      gaps.push({
        position: i,
        phase: r.phases[i]!,
        targetCamelot: key,
        targetBpm: prev.bpm,
        genre: prev.genre && weights[prev.genre] ? prev.genre : topGenre,
        era: eraRange,
        label: label(r.phases[i]!, key, prev.bpm),
      })
    }
  }
  // Library too thin to reach the duration: gap cards at the end.
  if (r.durationSec < o.durationSec * 0.95) {
    const lastT = r.tracks[r.tracks.length - 1] ?? null
    const missingMin = (o.durationSec - r.durationSec) / 60
    const n = Math.min(3, Math.max(1, Math.round(missingMin / 5)))
    for (let k = 0; k < n; k++) {
      const key = lastT?.camelot ? nextKey(lastT.camelot, 'up') : null
      gaps.push({
        position: r.tracks.length,
        phase: 'final climax',
        targetCamelot: key,
        targetBpm: lastT?.bpm ?? Math.round((preset.bpm[0] + preset.bpm[1]) / 2),
        genre: topGenre,
        era: eraRange,
        label: label('final climax', key, lastT?.bpm ?? null),
      })
    }
  }
  return { result: r, gaps, allowedCount: allowed.size }
}

export function presetById(id: PartyId, presets: PartyPreset[] = DEFAULT_PRESETS): PartyPreset {
  return presets.find((p) => p.id === id) ?? DEFAULT_PRESETS[0]!
}
