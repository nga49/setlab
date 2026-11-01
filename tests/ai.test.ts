import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/db'
import { setSettings } from '../src/db/settings'
import { AiError, budgetState, extractJson, monthKey, setTransportForTests, type AiTransport } from '../src/ai/client'
import { classicsRequest, discover, estimateBatch, estimateTrack, explainTransition, gapRequest, ownedForPrompt, partyRequest, trendingRequest } from '../src/ai/features'
import { costUsd, modelInfo } from '../src/ai/models'
import { cleanAiText, SYSTEM_DISCOVERY } from '../src/ai/prompts'
import { saveDiscovered } from '../src/missing/store'
import { presetById } from '../src/engine/parties'
import { CTX as _CTX, demoEngine } from './engine/helpers'

type Fixture = { model: string; stop_reason: string; content: { type: string; text?: string }[]; usage: Record<string, unknown> }
const fx = (name: string): Fixture => JSON.parse(readFileSync(`tests/fixtures/ai/${name}.json`, 'utf8'))
const textOf = (f: Fixture) => f.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')

/** Replays recorded responses in order, like the SDK transport would return them. */
function replay(structured: Fixture[], search: Fixture[]) {
  const calls: { kind: string; model: string; user: string }[] = []
  const t: AiTransport = {
    async structured(a) {
      calls.push({ kind: 'structured', model: a.model, user: a.user })
      const f = structured.shift()!
      let data: unknown = null
      try {
        data = JSON.parse(textOf(f))
      } catch {
        data = null
      }
      return { data: data as never, model: f.model, usage: f.usage, stop: f.stop_reason }
    },
    async searchText(a) {
      calls.push({ kind: 'search', model: a.model, user: a.user })
      const f = search.shift()!
      return { text: textOf(f), model: f.model, usage: f.usage, stop: f.stop_reason }
    },
  }
  setTransportForTests(t)
  return calls
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  await setSettings({ aiKey: 'test-key', aiBudgetEur: 5, eurPerUsd: 0.9 })
})
afterEach(() => setTransportForTests(null))

void _CTX

describe('estimate track (recorded fixtures)', () => {
  it('high confidence: one fast-model call, normalized output, usage recorded, then cached', async () => {
    const calls = replay([fx('estimate-high')], [])
    const e = await estimateTrack({ artist: 'Demo Artist 07', title: 'Demo Track K' })
    expect(e).toMatchObject({ bpm: 124, camelot: '8A', genre: 'Tech House', energy: 7, year: 2023, confidence: 'high' })
    expect(calls).toHaveLength(1)
    expect(calls[0]!.model).toBe('claude-haiku-5-5')
    const u = await db.aiUsage.get(monthKey())
    expect(u!.calls).toBe(1)
    expect(u!.costUsd).toBeCloseTo((512 * 0.1 + 96 * 0.5) / 1e6)
    await estimateTrack({ artist: 'Demo Artist 07', title: 'Demo Track K' })
    expect(calls).toHaveLength(1) // cache hit
  })

  it('low confidence escalates to the main model with web search', async () => {
    const calls = replay([fx('estimate-low')], [fx('estimate-search')])
    const e = await estimateTrack({ artist: 'Demo Artist 07', title: 'Demo Track Unknown' })
    expect(calls.map((c) => c.kind)).toEqual(['structured', 'search'])
    expect(calls[1]!.model).toBe('claude-opus-5-5')
    expect(e).toMatchObject({ bpm: 122, camelot: '4A', confidence: 'medium' })
    expect((await db.aiUsage.get(monthKey()))!.webSearches).toBe(1)
  })

  it('batch estimates map items back by index and clamp energy', async () => {
    replay([fx('batch')], [])
    const r = await estimateBatch([{ artist: 'a', title: 'x' }, { artist: 'b', title: 'y' }, { artist: 'c', title: 'z' }])
    expect(r[0]).toMatchObject({ camelot: '9A', energy: 4 })
    expect(r[1]).toBeNull()
    expect(r[2]).toMatchObject({ camelot: '10B', energy: 10 })
  })

  it('retries once on invalid output, then reports a plain error', async () => {
    const bad = { ...fx('estimate-high'), content: [{ type: 'text', text: 'not json' }] }
    replay([bad, fx('estimate-high')], [])
    expect((await estimateTrack({ artist: 'x', title: 'retry' })).bpm).toBe(124)
    replay([bad, bad], [])
    await expect(estimateTrack({ artist: 'x', title: 'fail' })).rejects.toThrow(/unexpected format/)
  })

  it('refusal and missing key are plain errors', async () => {
    replay([{ ...fx('estimate-high'), stop_reason: 'refusal' }], [])
    await expect(estimateTrack({ artist: 'x', title: 'refused' })).rejects.toMatchObject({ kind: 'refusal' })
    setTransportForTests(null)
    await setSettings({ aiKey: '' })
    await expect(estimateTrack({ artist: 'x', title: 'nokey' })).rejects.toMatchObject({ kind: 'nokey' })
  })
})

describe('discovery and guardrails', () => {
  it('parses web-search JSON, normalizes keys/genres/energy, keeps chart info', async () => {
    const calls = replay([], [fx('discovery')])
    const r = await discover(trendingRequest('Afro House', [120, 126], 'vocal', ['demo artist 01 · demo track a']))
    expect(calls[0]!.user).toContain('Already owned (do not suggest)')
    expect(calls[0]!.user).toContain('Afro House')
    expect(r.chart).toBe('hype')
    expect(r.trendNote).toBe('Percussive vocals are moving.')
    expect(r.tracks[1]).toMatchObject({ estCamelot: '8A', genre: 'Afro House', energy: 10 })
    const cost = costUsd('claude-opus-5-5', fx('discovery').usage)
    expect(cost).toBeCloseTo((12000 * 4 + 800 * 20 + 2000 * 0.2) / 1e6 + 0.03)
  })

  it('results are saved: owned tracks are 🟢, new ones 🔴', async () => {
    replay([], [fx('discovery')])
    const r = await discover(classicsRequest(2000, 2009, 'house', []))
    const saved = await saveDiscovered(r.tracks, 'classics', 'q', demoEngine())
    expect(saved[0]).toMatchObject({ status: 'owned', matchedTrackId: 'demo:01' })
    expect(saved[1]).toMatchObject({ status: 'missing' })
    // Saving again keeps the same row (no duplicates).
    await saveDiscovered(r.tracks, 'classics', 'q', demoEngine())
    expect(await db.missing.count()).toBe(2)
  })

  it('budget: warn at 80%, ask for confirmation at 100%', async () => {
    await db.aiUsage.put({ month: monthKey(), inputTokens: 0, outputTokens: 0, webSearches: 0, costUsd: 4.5, calls: 1 })
    expect((await budgetState()).level).toBe('warn')
    await db.aiUsage.put({ month: monthKey(), inputTokens: 0, outputTokens: 0, webSearches: 0, costUsd: 6, calls: 1 })
    expect((await budgetState()).level).toBe('over')
    replay([], [fx('discovery')])
    const req = gapRequest({ camelot: '9A', bpmFrom: 120, bpmTo: 126, genre: 'House' }, [])
    await expect(discover(req)).rejects.toBeInstanceOf(AiError)
    expect((await discover(req, { confirmOverBudget: true })).tracks).toHaveLength(2)
  })

  it('tip is cleaned and capped', async () => {
    replay([fx('tip')], [])
    const lib = demoEngine()
    const tip = await explainTransition(lib[0]!, lib[1]!, ['8A → 9A · +1'])
    expect(tip).toContain('16-bar')
    expect(tip.length).toBeLessThanOrEqual(240)
  })

  it('party request uses the nostalgia window; owned list is filtered and capped', () => {
    const req = partyRequest(presetById('wedding'), 35, 2026, [])
    expect(req.prompt).toContain('2006 to 2016')
    expect(req.max).toBe(25)
    const owned = ownedForPrompt(demoEngine(), { genres: ['Tech House'] }, 5)
    expect(owned).toHaveLength(5)
    expect(owned[0]).toMatch(/ · /)
  })
})

describe('helpers', () => {
  it('extractJson finds the last JSON object, tolerates fences and prose', () => {
    expect(extractJson('blah {"a":1} and ```json\n{"b":{"c":2}}\n```')).toEqual({ b: { c: 2 } })
    expect(extractJson('no json')).toBeNull()
    expect(extractJson('{broken')).toBeNull()
  })
  it('em dash is stripped from AI text; prompts never contain it', () => {
    const em = String.fromCharCode(0x2014)
    expect(cleanAiText(`A ${em} B`)).toBe('A: B')
    expect(SYSTEM_DISCOVERY.includes(em)).toBe(false)
  })
  it('model table', () => {
    expect(modelInfo('nope').id).toBe('claude-opus-5-5')
    expect(modelInfo('claude-haiku-5-5').webSearch).toBe(false)
  })
})
