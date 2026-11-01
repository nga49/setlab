import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_NAME } from '../src/config'

describe('app identity', () => {
  it('APP_NAME is defined once in src/config.ts', () => {
    expect(APP_NAME.length).toBeGreaterThan(0)
    // index.html must not hardcode the name: it is injected at build time.
    expect(readFileSync('index.html', 'utf8')).toContain('%APP_NAME%')
  })
})
