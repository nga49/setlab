import { describe, expect, it } from 'vitest'
import { generateSets } from '../../src/engine/generate'
import { LibraryGraph } from '../../src/engine/graph'
import { benchLibrary, CTX } from '../engine/helpers'

/**
 * Performance budgets (docs/ENGINE.md §7). Run without coverage instrumentation
 * (npm run test:perf), which would otherwise slow the engine several times.
 */
describe('performance budgets', () => {
  it('PERF: 40-track organizer < 300 ms', () => {
    const pool = benchLibrary(40)
    const t0 = performance.now()
    const res = generateSets(pool, { arc: 'full', targetSec: null, overlapSec: 60, picked: pool.map((x) => x.id), poolMode: 'picked', ctx: CTX })
    const ms = performance.now() - t0
    expect(res[0]!.tracks).toHaveLength(40)
    expect(ms).toBeLessThan(300 * 3) // 3 versions; each mode within the 300 ms budget
  })

  it('PERF: 2,000-track library fill < 1.5 s', () => {
    const big = benchLibrary(2000)
    const t0 = performance.now()
    const res = generateSets(big, { arc: 'full', targetSec: 3600, overlapSec: 60, poolMode: 'fill', ctx: CTX })
    const ms = performance.now() - t0
    expect(ms).toBeLessThan(1500)
    for (const r of res) expect(Math.abs(r.durationSec - 3600) / 3600).toBeLessThanOrEqual(0.05)
  })

  it('PERF: next tracks and path on 5,000 tracks stay fast', () => {
    const big = new LibraryGraph(benchLibrary(5000), CTX)
    const t0 = performance.now()
    big.nextTracks('bench:1')
    const t1 = performance.now()
    big.path('bench:1', 'bench:4000')
    const t2 = performance.now()
    expect(t1 - t0).toBeLessThan(100)
    expect(t2 - t1).toBeLessThan(1500)
  })
})
