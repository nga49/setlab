import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { KEY_TABLE } from '../src/engine/camelot'

describe('shared key table', () => {
  it('src/engine/camelot.ts matches sync/keys.json (used by the Python sync tool)', () => {
    const shared = JSON.parse(readFileSync('sync/keys.json', 'utf8')).keys
    expect(KEY_TABLE).toEqual(shared)
  })
})
