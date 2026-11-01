/**
 * Beatport copy helper (docs/AI.md §5). Primary action is 📋 Copy: Nico pastes the
 * string into the Beatport app. "Open Beatport" is a secondary link.
 */

export interface CopyTrack {
  artist: string
  title: string
  remix?: string | null
}

// En and em dashes built from char codes (the em dash may not appear in source).
const DASHES = String.fromCharCode(0x2013, 0x2014)
const DASH_SEPARATORS = new RegExp(`\\s[-${DASHES}]\\s|[-${DASHES}]{2,}`, 'g')
const FEAT = /\s*[([]?\s*\b(?:feat\.?|ft\.?|featuring)\s[^)\]]*[)\]]?/gi

function clean(s: string): string {
  return s
    .replace(FEAT, ' ')
    .replace(/[()[\]{}]/g, ' ')
    .replace(DASH_SEPARATORS, ' ')
    .replace(/\boriginal mix\b/gi, ' ')
    .replace(/[“”"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Main artist only: first name before "&", ",", " x ", " and ", " vs ". */
export function mainArtist(artist: string): string {
  return clean(artist).split(/\s*(?:,|&|\bx\b|\band\b|\bvs\.?\b)\s*/i)[0]?.trim() ?? ''
}

/** Full = artist + title + remix name · Short = main artist + title. */
export function toBeatportQuery(t: CopyTrack, mode: 'full' | 'short'): string {
  const title = clean(t.title)
  if (mode === 'short') return clean(`${mainArtist(t.artist)} ${title}`)
  const remix = t.remix ? clean(t.remix) : ''
  return clean(`${clean(t.artist)} ${title} ${remix}`)
}

/** Beatport web search URL (secondary "Open Beatport" action). Format verified in DECISIONS.md. */
export function beatportSearchUrl(t: CopyTrack): string {
  return `https://www.beatport.com/search?q=${encodeURIComponent(toBeatportQuery(t, 'short'))}`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for browsers without async clipboard permission.
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}
