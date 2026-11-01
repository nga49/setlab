/**
 * Custom title font chosen on the phone (Settings › Look). The file is stored in the
 * on-device database only, never in the repo or on the website, so fonts whose license
 * forbids redistribution can still be used privately. Applied with the CSS Font Loading API.
 */
export interface TitleFont {
  name: string
  /** Font file bytes, base64 (JSON friendly, so it rides along in backups). */
  data: string
}

export const TITLE_FONT_FAMILY = 'UserTitle'
export const TITLE_FONT_MAX_BYTES = 2 * 1024 * 1024
const DEFAULT_STACK = "'SetlabTitle', 'Space Grotesk', system-ui, sans-serif"

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export class TitleFontError extends Error {}

/** Loads the bytes as a font; throws TitleFontError when this browser cannot use them. */
async function loadFace(bytes: Uint8Array<ArrayBuffer>): Promise<FontFace> {
  if (typeof FontFace === 'undefined') throw new TitleFontError('This browser cannot load custom fonts.')
  try {
    const face = new FontFace(TITLE_FONT_FAMILY, bytes)
    await face.load()
    return face
  } catch {
    throw new TitleFontError('This file is not a font the phone can use. Pick a .ttf, .otf, .woff or .woff2 file.')
  }
}

/** Reads a picked file and checks it really is a usable font before it gets saved. */
export async function readFontFile(file: File): Promise<TitleFont> {
  if (file.size > TITLE_FONT_MAX_BYTES) throw new TitleFontError('This file is too big for a title font (2 MB max).')
  const bytes = new Uint8Array(await file.arrayBuffer())
  await loadFace(bytes)
  return { name: file.name.replace(/\.(ttf|otf|woff2?)$/i, ''), data: bytesToBase64(bytes) }
}

let current: FontFace | null = null

/** Switches titles to the given font, or back to the default one with null. */
export async function applyTitleFont(font: TitleFont | null): Promise<void> {
  const root = document.documentElement
  if (current) {
    document.fonts.delete(current)
    current = null
  }
  if (!font) {
    root.style.removeProperty('--font-title')
    return
  }
  const face = await loadFace(base64ToBytes(font.data))
  document.fonts.add(face)
  current = face
  root.style.setProperty('--font-title', `'${TITLE_FONT_FAMILY}', ${DEFAULT_STACK}`)
}
