/**
 * Text normalizer and fuzzy matching (docs/DATA.md §3 and §4). Used to match
 * pasted lists, quick-added tracks and AI results against the library.
 */

export interface TrackRef {
  artist: string
  title: string
  remix?: string | null
}

const FEAT = /\s*[([]?\s*\b(?:feat\.?|ft\.?|featuring)\s[^)\]]*[)\]]?/gi
const MIX_WORDS = /\b(original|extended|radio|club|album|single)\s+(mix|edit|version)\b/g

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Split "Title (Someone Remix)" into title + remix. Plain "(Original Mix)" is not a remix. */
export function splitRemix(title: string): { title: string; remix: string | null } {
  const m = /^(.*?)\s*[([]([^)\]]*\b(?:remix|mix|edit|dub|rework|version|vip|bootleg|refix|flip)\b[^)\]]*)[)\]]\s*$/i.exec(title)
  if (!m) return { title: title.trim(), remix: null }
  const remix = m[2]!.trim()
  if (/^(original|extended|radio|club|album)\s+(mix|edit|version)$/i.test(remix)) return { title: m[1]!.trim(), remix: null }
  return { title: m[1]!.trim(), remix }
}

export function normalizeText(s: string | null | undefined): string {
  if (!s) return ''
  let x = stripAccents(String(s)).toLowerCase()
  x = x.replace(FEAT, ' ')
  x = x.replace(/[([][^)\]]*[)\]]/g, ' ')
  x = x.replace(MIX_WORDS, ' ')
  x = x.replace(/&/g, ' and ')
  x = x.replace(/[^a-z0-9]+/g, ' ')
  return x.replace(/\s+/g, ' ').trim()
}

export function normalizeArtist(s: string | null | undefined): string {
  if (!s) return ''
  const x = stripAccents(String(s))
    .toLowerCase()
    .replace(FEAT, ' ')
    .replace(/\b(feat\.?|ft\.?|featuring|vs\.?|x|and)\b/g, ' ')
    .replace(/[&,+/]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
  // Token order does not matter for artists ("A & B" == "B, A").
  return x.split(/\s+/).filter(Boolean).sort().join(' ')
}

export function normalizeRemix(s: string | null | undefined): string {
  if (!s) return ''
  return normalizeText(s.replace(/\b(remix|mix|edit|rework|version)\b/gi, ' '))
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>()
  const t = ` ${s} `
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2)
    m.set(g, (m.get(g) ?? 0) + 1)
  }
  return m
}

/** Dice coefficient on character bigrams (0..1). */
export function similarity(a: string, b: string): number {
  if (!a && !b) return 1
  if (!a || !b) return 0
  if (a === b) return 1
  const A = bigrams(a)
  const B = bigrams(b)
  let inter = 0
  let total = 0
  for (const [g, n] of A) {
    total += n
    const m = B.get(g)
    if (m) inter += Math.min(n, m)
  }
  for (const n of B.values()) total += n
  return (2 * inter) / total
}

export interface Prepped {
  artist: string
  title: string
  remix: string
}

export function prep(t: TrackRef): Prepped {
  const split = t.remix ? { title: t.title, remix: t.remix } : splitRemix(t.title)
  return { artist: normalizeArtist(t.artist), title: normalizeText(split.title), remix: normalizeRemix(split.remix) }
}

/**
 * Word-level fuzzy similarity: each word is matched to its closest word on the
 * other side (character bigrams), averaged both ways. Tolerates typos ("trak")
 * but a different word ("Track K" vs "Track Q") counts fully against the match.
 */
export function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const A = a.split(' ').filter(Boolean)
  const B = b.split(' ').filter(Boolean)
  if (!A.length || !B.length) return A.length === B.length ? 1 : 0
  const side = (X: string[], Y: string[]) => {
    let sum = 0
    for (const x of X) {
      let best = 0
      for (const y of Y) {
        // Numbers and very short words must match exactly ("07" is not "08").
        const exactOnly = /^\d+$/.test(x) || /^\d+$/.test(y) || x.length <= 2 || y.length <= 2
        const s = x === y ? 1 : exactOnly ? 0 : similarity(x, y)
        if (s > best) best = s
      }
      sum += best
    }
    return sum / X.length
  }
  return (side(A, B) + side(B, A)) / 2
}

/** Remix-aware match score between two prepared tracks (0..1). */
export function matchPrepped(pa: Prepped, pb: Prepped, strictRemix = false): number {
  const art = pa.artist && pb.artist ? wordSimilarity(pa.artist, pb.artist) : 0.75
  const tit = wordSimilarity(pa.title, pb.title)
  let s = 0.45 * art + 0.55 * tit
  // Same title by a clearly different artist is a different track.
  if (pa.artist && pb.artist && art < 0.75) s *= 0.85
  if (pa.remix && pb.remix) {
    if (wordSimilarity(pa.remix, pb.remix) < 0.6) s *= 0.75
  } else if (pa.remix || pb.remix) s *= strictRemix ? 0.75 : 0.9
  return s
}

/** Remix-aware match score between two tracks (0..1). */
export function matchScore(a: TrackRef, b: TrackRef): number {
  return matchPrepped(prep(a), prep(b))
}

export const MATCH_THRESHOLD = 0.8

export interface MatchHit<T> {
  item: T
  confidence: number
}

/** Index a list once, then match many queries against it. */
export class Matcher<T extends TrackRef> {
  private readonly prepped: { item: T; p: Prepped }[]
  constructor(items: T[]) {
    this.prepped = items.map((item) => ({ item, p: prep(item) }))
  }
  /** strictRemix: an original never matches a remix (ownership checks). */
  best(q: TrackRef, threshold = MATCH_THRESHOLD, strictRemix = false): MatchHit<T> | null {
    const pq = prep(q)
    let best: MatchHit<T> | null = null
    for (const { item, p } of this.prepped) {
      // Cheap pre-filter: titles must share something.
      if (pq.title && p.title && pq.title[0] !== p.title[0] && similarity(pq.title, p.title) < 0.5) continue
      const c = matchPrepped(pq, p, strictRemix)
      if (!best || c > best.confidence) best = { item, confidence: c }
    }
    return best && best.confidence >= threshold ? best : null
  }
}

/**
 * Parse one pasted line: "01. Artist - Title (Remix)", "Artist · Title", "Artist\tTitle",
 * "Title by Artist". Returns null for empty lines.
 */
export function parseTrackLine(line: string): TrackRef | null {
  let s = line.replace(/[ \u00a0]+/g, ' ').trim()
  if (!s) return null
  s = s.replace(/^(\d{1,3}[.)]|\d{1,3}\s+[-\u2013\u2014]|[-*\u2022])\s*/, '').trim()
  if (!s) return null
  let artist = ''
  let title = s
  const sep = /\t+|\s+[-\u2013\u2014\u00b7|]\s+/.exec(s)
  if (sep) {
    artist = s.slice(0, sep.index).trim()
    title = s.slice(sep.index + sep[0].length).trim()
  } else {
    const by = /^(.*)\s+by\s+(.*)$/i.exec(s)
    if (by) {
      title = by[1]!.trim()
      artist = by[2]!.trim()
    }
  }
  const r = splitRemix(title)
  return { artist, title: r.title, remix: r.remix }
}

export function parseTrackList(text: string): TrackRef[] {
  return text
    .split(/\r?\n/)
    .map(parseTrackLine)
    .filter((x): x is TrackRef => !!x && !!x.title)
}
