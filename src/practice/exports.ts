import { APP_NAME } from '../config'
import { musicalName } from '../engine/camelot'

/** Set exports (docs/PRODUCT.md Practice › Export). Pure functions, tested. */

export interface ExportTrack {
  id: string
  artist: string
  title: string
  remix: string | null
  bpm: number | null
  camelot: string | null
  lengthSec: number | null
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export function slug(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'set'
  )
}

/** rekordbox content id from an app id ("rb:12345" → "12345"), or null for non-rekordbox tracks. */
export function rekordboxId(id: string): string | null {
  const m = /^rb:(\d+)$/.exec(id)
  return m ? m[1]! : null
}

/**
 * rekordbox playlist XML (format per pyrekordbox rbxml: DJ_PLAYLISTS v1.0.0 > PRODUCT,
 * COLLECTION/TRACK, PLAYLISTS/NODE). Tracks are referenced by their rekordbox ids
 * (KeyType 0). No file paths: the laptop tool adds Locations before rekordbox imports it.
 */
export function toRekordboxXml(name: string, tracks: ExportTrack[], version = '1'): { xml: string; skipped: number } {
  const rb = tracks.filter((t) => rekordboxId(t.id))
  const unique = [...new Map(rb.map((t) => [t.id, t])).values()]
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<DJ_PLAYLISTS Version="1.0.0">',
    `  <PRODUCT Name="${esc(APP_NAME)}" Version="${esc(version)}" Company=""/>`,
    `  <COLLECTION Entries="${unique.length}">`,
  ]
  for (const t of unique) {
    const attrs = [
      `TrackID="${rekordboxId(t.id)}"`,
      `Name="${esc(t.remix ? `${t.title} (${t.remix})` : t.title)}"`,
      `Artist="${esc(t.artist)}"`,
      t.bpm ? `AverageBpm="${t.bpm.toFixed(2)}"` : '',
      t.camelot ? `Tonality="${esc(musicalName(t.camelot))}"` : '',
      t.lengthSec ? `TotalTime="${Math.round(t.lengthSec)}"` : '',
    ].filter(Boolean)
    lines.push(`    <TRACK ${attrs.join(' ')}/>`)
  }
  lines.push('  </COLLECTION>', '  <PLAYLISTS>', '    <NODE Type="0" Name="ROOT" Count="1">', `      <NODE Name="${esc(name)}" Type="1" KeyType="0" Entries="${rb.length}">`)
  for (const t of rb) lines.push(`        <TRACK Key="${rekordboxId(t.id)}"/>`)
  lines.push('      </NODE>', '    </NODE>', '  </PLAYLISTS>', '</DJ_PLAYLISTS>', '')
  return { xml: lines.join('\n'), skipped: tracks.length - rb.length }
}

/** Numbered list with BPM and key, for the clipboard. */
export function toText(name: string, tracks: ExportTrack[]): string {
  const rows = tracks.map((t, i) => {
    const title = t.remix ? `${t.title} (${t.remix})` : t.title
    const meta = [t.bpm ? `${Math.round(t.bpm)} BPM` : null, t.camelot ? `${t.camelot} ${musicalName(t.camelot)}` : null].filter(Boolean).join(' · ')
    return `${String(i + 1).padStart(2, '0')}. ${t.artist} - ${title}${meta ? ` · ${meta}` : ''}`
  })
  return `${name}\n${rows.join('\n')}\n`
}

/** Extended M3U. The app has no file paths, so entries carry names and rekordbox ids only. */
export function toM3u(name: string, tracks: ExportTrack[]): string {
  const out = ['#EXTM3U', `#PLAYLIST:${name}`]
  for (const t of tracks) {
    const title = t.remix ? `${t.title} (${t.remix})` : t.title
    out.push(`#EXTINF:${t.lengthSec ? Math.round(t.lengthSec) : -1},${t.artist} - ${title}`)
    if (rekordboxId(t.id)) out.push(`#SETLAB-ID:${t.id}`)
    out.push(`${t.artist} - ${title}`)
  }
  return out.join('\n') + '\n'
}

export function exportFileName(name: string, ext: 'xml' | 'm3u' | 'txt'): string {
  return `setlab-${slug(name)}.${ext}`
}

/** Share via the phone share sheet when possible, else download the file. */
export async function shareOrDownload(fileName: string, content: string, mime: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = new Blob([content], { type: mime })
  const file = typeof File !== 'undefined' ? new File([blob], fileName, { type: mime }) : null
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (file && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'downloaded'
}
