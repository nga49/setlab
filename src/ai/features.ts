import type { TrackRef } from '../engine/match'
import { normalizeArtist, normalizeText } from '../engine/match'
import { parseKey } from '../engine/camelot'
import { normalizeGenre } from '../engine/genres'
import type { EngineTrack } from '../engine/types'
import type { Gap, PartyPreset } from '../engine/parties'
import { nostalgiaWindow } from '../engine/parties'
import { callSearch, callStructured, type CallOptions } from './client'
import { getSettings } from '../db/settings'
import { DEFAULT_MAIN_MODEL } from './models'
import { batchEstimateSchema, DISCOVERY_JSON_SHAPE, discoverySchema, estimateSchema, tipSchema, type DiscoveredTrack, type EstimateOut } from './schemas'
import { cleanAiText, SYSTEM_DISCOVERY, SYSTEM_ESTIMATE, SYSTEM_TIP } from './prompts'
import type { EstimateResult } from './types'

const ref = (t: TrackRef) => `${t.artist ? `${t.artist} - ` : ''}${t.title}${t.remix ? ` (${t.remix})` : ''}`

function clamp(n: number | null, lo: number, hi: number): number | null {
  return n == null || !Number.isFinite(n) ? null : Math.max(lo, Math.min(hi, n))
}

/** Normalize model output into app types (Camelot parsed, energy 1..10, genre canonical). */
export function toEstimate(e: EstimateOut): EstimateResult {
  return {
    bpm: clamp(e.bpm, 40, 220),
    camelot: parseKey(e.camelot) ?? parseKey(e.keyName),
    keyName: e.keyName,
    genre: e.genre ? normalizeGenre(e.genre) : null,
    energy: e.energy == null ? null : Math.round(clamp(e.energy, 1, 10)!),
    year: clamp(e.year, 1900, 2100),
    confidence: e.confidence,
    note: cleanAiText(e.note ?? ''),
  }
}

/** Estimate one track: fast model first; low confidence → main model with web search. */
export async function estimateTrack(t: TrackRef, opts: CallOptions = {}): Promise<EstimateResult> {
  const user = `Estimate BPM, key, genre, energy and release year for: ${ref(t)}`
  const r = await callStructured('estimate', { system: SYSTEM_ESTIMATE, user, schema: estimateSchema, maxTokens: 1200 }, opts)
  if (r.data.confidence !== 'low') return toEstimate(r.data)
  const s = await getSettings()
  const deep = await callSearch(
    'estimate',
    {
      model: s.aiMainModel || DEFAULT_MAIN_MODEL,
      system: SYSTEM_ESTIMATE,
      user: `${user}\nSearch the web to confirm the release, its BPM and key. Reply with only this JSON: {"bpm":number|null,"camelot":string|null,"keyName":string|null,"genre":string|null,"energy":number|null,"year":number|null,"confidence":"high"|"medium"|"low","note":string}`,
      schema: estimateSchema,
      maxSearches: 3,
    },
    opts,
  )
  return toEstimate(deep.data)
}

/** Batch estimates: up to 20 tracks per request. */
export async function estimateBatch(list: TrackRef[], opts: CallOptions = {}): Promise<(EstimateResult | null)[]> {
  const out: (EstimateResult | null)[] = list.map(() => null)
  for (let start = 0; start < list.length; start += 20) {
    const chunk = list.slice(start, start + 20)
    const user = `Estimate BPM, key, genre, energy and release year for each numbered track. Return one item per track with its index.\n${chunk.map((t, i) => `${i}. ${ref(t)}`).join('\n')}`
    const r = await callStructured('estimate-batch', { system: SYSTEM_ESTIMATE, user, schema: batchEstimateSchema, maxTokens: 6000 }, opts)
    for (const it of r.data.items) if (it.index >= 0 && it.index < chunk.length) out[start + it.index] = toEstimate(it)
  }
  return out
}

/** Compact owned list for the prompt: normalized "artist · title", filtered, capped ~400. */
export function ownedForPrompt(library: EngineTrack[], filter: { genres?: string[]; years?: [number, number] } = {}, cap = 400): string[] {
  const out: string[] = []
  for (const t of library) {
    if (filter.genres?.length && t.genre && !filter.genres.includes(t.genre)) continue
    if (filter.years && t.year && (t.year < filter.years[0] || t.year > filter.years[1])) continue
    out.push(`${normalizeArtist(t.artist)} · ${normalizeText(t.title)}`)
    if (out.length >= cap) break
  }
  return out
}

function ownedBlock(owned: string[]): string {
  return owned.length ? `\nAlready owned (do not suggest):\n${owned.join('\n')}` : ''
}

const RULES =
  '\nRules: only real, verifiable releases; if unsure a track exists, leave it out. Give a confidence per track. Reply with only this JSON:\n' + DISCOVERY_JSON_SHAPE

export interface DiscoveryRequest {
  mode: 'classics' | 'party' | 'trending' | 'gap' | 'party-gap'
  /** Human summary of the query, stored with results. */
  query: string
  prompt: string
  max: number
  owned: string[]
}

export function classicsRequest(eraFrom: number, eraTo: number, genreText: string, owned: string[]): DiscoveryRequest {
  return {
    mode: 'classics',
    query: `${eraFrom} to ${eraTo} · ${genreText}`,
    max: 25,
    owned,
    prompt: `List up to 25 well-known tracks released between ${eraFrom} and ${eraTo} for this style: "${genreText}". Use web search to check them. Favour tracks that work on a dancefloor.`,
  }
}

export function partyRequest(preset: PartyPreset, crowdAge: number, nowYear: number, owned: string[]): DiscoveryRequest {
  const [a, b] = nostalgiaWindow(crowdAge, nowYear)
  const genres = Object.entries(preset.genres)
    .filter(([, w]) => w >= 0.6)
    .map(([g]) => g)
    .join(', ')
  return {
    mode: 'party',
    query: `${preset.emoji} ${preset.label} · crowd ${crowdAge}`,
    max: 25,
    owned,
    prompt: `List up to 25 tracks that reliably fill the floor at a ${preset.label.toLowerCase()} party. Median guest age ${crowdAge}: favour hits from ${a} to ${b} plus current crowd-pleasers. Genres: ${genres || 'any'}. BPM ${preset.bpm[0]} to ${preset.bpm[1]}.`,
  }
}

export function trendingRequest(genre: string, bpm: [number, number], vibe: string, owned: string[]): DiscoveryRequest {
  return {
    mode: 'trending',
    query: `${genre} · ${bpm[0]} to ${bpm[1]} BPM${vibe ? ` · ${vibe}` : ''}`,
    max: 10,
    owned,
    prompt: `Find the 10 trendiest tracks right now on Beatport for genre "${genre}" between ${bpm[0]} and ${bpm[1]} BPM${vibe ? `, vibe: ${vibe}` : ''}. Search Beatport charts (Top 100, Hype, new releases) and DJ support. Rank from most to least trending. Set "chart" to the main chart you used and "trendNote" to one sentence on what is moving.`,
  }
}

export function gapRequest(g: { camelot: string; bpmFrom: number; bpmTo: number; genre: string | null }, owned: string[]): DiscoveryRequest {
  return {
    mode: 'gap',
    query: `${g.camelot} ±1 · ${g.bpmFrom} to ${g.bpmTo} BPM${g.genre ? ` · ${g.genre}` : ''}`,
    max: 10,
    owned,
    prompt: `Nico's library is thin around Camelot ${g.camelot} at ${g.bpmFrom} to ${g.bpmTo} BPM${g.genre ? ` in ${g.genre}` : ''}. Find up to 10 real tracks in key ${g.camelot} or one step away (±1 or relative) and inside that BPM band. Check keys and BPMs on the web (Beatport pages list them).`,
  }
}

export function partyGapRequest(gap: Gap, preset: PartyPreset, owned: string[]): DiscoveryRequest {
  const era = gap.era ? ` from ${gap.era[0]} to ${gap.era[1]}` : ''
  return {
    mode: 'party-gap',
    query: gap.label,
    max: 5,
    owned,
    prompt: `For a ${preset.label.toLowerCase()} set, find up to 5 tracks for this spot: ${gap.phase} phase, around ${gap.targetCamelot ?? 'any key'} (±1 is fine), about ${gap.targetBpm ? Math.round(gap.targetBpm) : 'any'} BPM${gap.genre ? `, ${gap.genre}` : ''}${era}.`,
  }
}

export async function discover(req: DiscoveryRequest, opts: CallOptions = {}): Promise<{ tracks: DiscoveredTrack[]; chart: string | null; trendNote: string | null; cached: boolean }> {
  const r = await callSearch(
    req.mode,
    {
      system: SYSTEM_DISCOVERY,
      user: `${req.prompt}\nAt most ${req.max} tracks.${RULES}${ownedBlock(req.owned)}`,
      schema: discoverySchema,
      maxSearches: req.mode === 'trending' ? 6 : 4,
    },
    opts,
  )
  const tracks = r.data.tracks.slice(0, req.max).map((t) => ({
    ...t,
    estCamelot: parseKey(t.estCamelot) ?? null,
    genre: t.genre ? normalizeGenre(t.genre) : null,
    why: cleanAiText(t.why),
    energy: t.energy == null ? null : Math.round(Math.max(1, Math.min(10, t.energy))),
  }))
  return { tracks, chart: r.data.chart ?? null, trendNote: r.data.trendNote ? cleanAiText(r.data.trendNote) : null, cached: r.cached }
}

/** Optional "explain transition" tip (fast model, no web search). */
export async function explainTransition(a: EngineTrack, b: EngineTrack, reasons: string[], opts: CallOptions = {}): Promise<string> {
  const user = `From: ${ref(a)} (${a.camelot ?? '?'}, ${a.bpm ?? '?'} BPM, energy ${a.energy}, ${a.genre ?? '?'})\nTo: ${ref(b)} (${b.camelot ?? '?'}, ${b.bpm ?? '?'} BPM, energy ${b.energy}, ${b.genre ?? '?'})\nEngine notes: ${reasons.join(' · ')}\nGive one tip for this mix.`
  const r = await callStructured('tip', { system: SYSTEM_TIP, user, schema: tipSchema, maxTokens: 800 }, opts)
  return cleanAiText(r.data.tip).slice(0, 240)
}
