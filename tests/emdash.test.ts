import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// CLAUDE.md writing rule: the em dash (U+2014) must never appear in the app.
const EM_DASH = String.fromCharCode(0x2014)

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

describe('em dash guard', () => {
  const roots = ['src', 'docs', 'sync', 'e2e', 'tests']
  const files = roots.flatMap((r) => {
    try {
      return walk(r)
    } catch {
      return []
    }
  }).filter((f) => /\.(tsx?|css|md|py|json|html|bat|txt)$/.test(f) && !f.includes('node_modules'))
  files.push('index.html', 'README.md', 'HUMAN_TASKS.md', 'DECISIONS.md', 'CLAUDE.md')

  it('scans at least the source tree', () => {
    expect(files.filter((f) => f.startsWith('src')).length).toBeGreaterThan(5)
  })

  it.each(files)('%s has no em dash', (f) => {
    const text = readFileSync(f, 'utf8')
    const line = text.split('\n').findIndex((l) => l.includes(EM_DASH))
    expect(line, `em dash found in ${f} at line ${line + 1}`).toBe(-1)
  })
})
