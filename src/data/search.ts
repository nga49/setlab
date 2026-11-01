import { normalizeText } from '../engine/match'

/** Instant fuzzy search by artist/title: every query word must appear (prefix or substring). */

const hay = new WeakMap<object, string>()

function haystack(t: { artist: string; title: string; remix: string | null }): string {
  let h = hay.get(t)
  if (h === undefined) {
    h = ` ${normalizeText(t.artist)} ${normalizeText(t.title)} ${normalizeText(t.remix)} `
    hay.set(t, h)
  }
  return h
}

export function searchTracks<T extends { artist: string; title: string; remix: string | null }>(list: T[], query: string, limit = 50): T[] {
  const q = normalizeText(query)
  if (!q) return list.slice(0, limit)
  const words = q.split(' ')
  const scored: { t: T; s: number }[] = []
  for (const t of list) {
    const h = haystack(t)
    let s = 0
    let ok = true
    for (const w of words) {
      const i = h.indexOf(w)
      if (i < 0) {
        ok = false
        break
      }
      s += h[i - 1] === ' ' ? 2 : 1 // word-start matches rank higher
    }
    if (ok) scored.push({ t, s })
  }
  scored.sort((a, b) => b.s - a.s)
  return scored.slice(0, limit).map((x) => x.t)
}
