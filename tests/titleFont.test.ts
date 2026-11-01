import { describe, expect, it } from 'vitest'
import { base64ToBytes, bytesToBase64, readFontFile, TITLE_FONT_MAX_BYTES, TitleFontError } from '../src/ui/titleFont'
import { DEFAULT_SETTINGS, SECRET_KEYS } from '../src/db/settings'
import { APP_NAME, APP_SLUG } from '../src/config'

describe('title font picked on the phone', () => {
  it('round-trips bytes through base64, including large files', () => {
    const bytes = new Uint8Array(200_000).map((_, i) => (i * 31) % 256)
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes)
  })

  it('refuses files over the size limit before reading them', async () => {
    const big = new File([new Uint8Array(TITLE_FONT_MAX_BYTES + 1)], 'huge.ttf')
    await expect(readFontFile(big)).rejects.toBeInstanceOf(TitleFontError)
  })

  it('is a normal setting: off by default, not a secret, so backups keep it', () => {
    expect(DEFAULT_SETTINGS.titleFont).toBeNull()
    expect(SECRET_KEYS).not.toContain('titleFont')
  })
})

describe('app identity', () => {
  it('shows the new name but keeps the internal id that names the database and backups', () => {
    expect(APP_NAME).toBe('Awesome Mix')
    expect(APP_SLUG).toBe('setlab')
  })
})
