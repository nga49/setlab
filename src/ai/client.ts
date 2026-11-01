import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { z } from 'zod'
import { db, nowIso } from '../db/db'
import { getSettings } from '../db/settings'
import { costUsd, DEFAULT_FAST_MODEL, DEFAULT_MAIN_MODEL, modelInfo, WEB_SEARCH_TOOL, type UsageLike } from './models'
import { cleanAiText } from './prompts'

/** Claude API access from the browser with Nico's own key (docs/AI.md §1, §3). */

export class AiError extends Error {
  constructor(
    message: string,
    readonly kind: 'nokey' | 'budget' | 'auth' | 'rate' | 'network' | 'refusal' | 'invalid' | 'other' = 'other',
  ) {
    super(message)
  }
}

export interface CallResult<T> {
  data: T
  model: string
  usage: UsageLike
  cached: boolean
}

/** What a transport must do. Production uses the SDK; tests use recorded fixtures. */
export interface AiTransport {
  structured<T>(a: { model: string; system: string; user: string; schema: z.ZodType<T>; maxTokens: number }): Promise<{ data: T | null; model: string; usage: UsageLike; stop: string | null }>
  searchText(a: { model: string; system: string; user: string; maxSearches: number; maxTokens: number }): Promise<{ text: string; model: string; usage: UsageLike; stop: string | null }>
}

function mapError(e: unknown): AiError {
  if (e instanceof AiError) return e
  if (e instanceof Anthropic.AuthenticationError) return new AiError('API key rejected: check it in Settings › AI.', 'auth')
  if (e instanceof Anthropic.PermissionDeniedError) return new AiError('This API key cannot use that model: pick another in Settings › AI.', 'auth')
  if (e instanceof Anthropic.RateLimitError) return new AiError('Too many requests right now: wait a minute and try again.', 'rate')
  if (e instanceof Anthropic.BadRequestError) return new AiError(`Claude refused the request: ${e.message}`, 'other')
  if (e instanceof Anthropic.APIConnectionError) return new AiError('No connection: AI needs the internet.', 'network')
  if (e instanceof Anthropic.APIError) return new AiError(`Claude API error ${e.status ?? ''}: try again later.`, 'other')
  return new AiError(e instanceof Error ? e.message : 'AI call failed.', 'other')
}

/** Production transport built on the official SDK. */
export function sdkTransport(apiKey: string): AiTransport {
  // The key is entered by Nico and kept on his phone; direct browser access is required for a static site.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 })
  return {
    async structured({ model, system, user, schema, maxTokens }) {
      const r = await client.messages.parse({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
        output_config: { format: zodOutputFormat(schema), effort: 'low' },
      })
      return { data: (r.parsed_output ?? null) as never, model: r.model, usage: r.usage, stop: r.stop_reason }
    },
    async searchText({ model, system, user, maxSearches, maxTokens }) {
      const info = modelInfo(model)
      const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: user }]
      const total: UsageLike & { server_tool_use: { web_search_requests: number } } = {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        server_tool_use: { web_search_requests: 0 },
      }
      let last: Anthropic.Beta.BetaMessage | null = null
      // Server-side tool loops may pause (pause_turn): resend to continue, up to 3 times.
      for (let i = 0; i < 4; i++) {
        last = await client.beta.messages.create({
          model,
          max_tokens: maxTokens,
          system,
          messages,
          tools: info.webSearch ? [{ type: WEB_SEARCH_TOOL, name: 'web_search', max_uses: maxSearches }] : [],
          output_config: { effort: 'medium' },
          ...(info.fallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
        })
        const u = last.usage
        total.input_tokens! += u.input_tokens ?? 0
        total.output_tokens! += u.output_tokens ?? 0
        total.cache_creation_input_tokens! += u.cache_creation_input_tokens ?? 0
        total.cache_read_input_tokens! += u.cache_read_input_tokens ?? 0
        total.server_tool_use.web_search_requests += u.server_tool_use?.web_search_requests ?? 0
        if (last.stop_reason !== 'pause_turn') break
        messages.push({ role: 'assistant', content: last.content })
      }
      const text = (last?.content ?? [])
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
      return { text, model: last?.model ?? model, usage: total, stop: last?.stop_reason ?? null }
    },
  }
}

// ---------------------------------------------------------------------------
// Usage, budget and cache

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function recordUsage(model: string, usage: UsageLike): Promise<number> {
  const cost = costUsd(model, usage)
  const month = monthKey()
  const cur = (await db.aiUsage.get(month)) ?? { month, inputTokens: 0, outputTokens: 0, webSearches: 0, costUsd: 0, calls: 0 }
  await db.aiUsage.put({
    month,
    inputTokens: cur.inputTokens + (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
    outputTokens: cur.outputTokens + (usage.output_tokens ?? 0),
    webSearches: cur.webSearches + (usage.server_tool_use?.web_search_requests ?? 0),
    costUsd: cur.costUsd + cost,
    calls: cur.calls + 1,
  })
  return cost
}

export interface BudgetState {
  spentEur: number
  budgetEur: number
  ratio: number
  level: 'ok' | 'warn' | 'over'
}

export async function budgetState(): Promise<BudgetState> {
  const s = await getSettings()
  const u = await db.aiUsage.get(monthKey())
  const spentEur = (u?.costUsd ?? 0) * s.eurPerUsd
  const ratio = s.aiBudgetEur > 0 ? spentEur / s.aiBudgetEur : 1
  return { spentEur, budgetEur: s.aiBudgetEur, ratio, level: ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok' }
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const TTL_DAYS: Record<string, number> = {
  estimate: 90,
  'estimate-batch': 90,
  classics: 14,
  party: 14,
  trending: 1,
  gap: 7,
  'party-gap': 7,
  tip: 90,
}

let transportOverride: AiTransport | null = null
/** Tests inject a recorded-fixture transport here. */
export function setTransportForTests(t: AiTransport | null) {
  transportOverride = t
}

export interface CallOptions {
  /** User confirmed a call over the monthly budget. */
  confirmOverBudget?: boolean
}

async function prepare(feature: string, keyParts: unknown, opts: CallOptions) {
  const s = await getSettings()
  if (!s.aiKey && !transportOverride) throw new AiError('Add your Claude API key in Settings › AI.', 'nokey')
  const hash = await sha256(JSON.stringify([feature, keyParts]))
  const hit = await db.aiCache.get(hash)
  if (hit && Date.now() - Date.parse(hit.date) < (TTL_DAYS[feature] ?? 7) * 86400_000) return { s, hash, hit }
  const b = await budgetState()
  if (b.level === 'over' && !opts.confirmOverBudget) {
    throw new AiError(`Monthly AI budget reached (~€${b.spentEur.toFixed(2)} of €${b.budgetEur}). Confirm to spend more.`, 'budget')
  }
  return { s, hash, hit: undefined }
}

function transport(key: string): AiTransport {
  return transportOverride ?? sdkTransport(key)
}

/** Structured-output call (no web search). Retries once on invalid output. */
export async function callStructured<T>(
  feature: string,
  a: { model?: string; system: string; user: string; schema: z.ZodType<T>; maxTokens?: number },
  opts: CallOptions = {},
): Promise<CallResult<T>> {
  const model = a.model
  const p = await prepare(feature, [model, a.system, a.user], opts)
  if (p.hit) return { data: p.hit.response as T, model: model ?? '', usage: {}, cached: true }
  const m = model || p.s.aiFastModel || DEFAULT_FAST_MODEL
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await transport(p.s.aiKey).structured({ model: m, system: a.system, user: a.user, schema: a.schema, maxTokens: a.maxTokens ?? 4000 })
      await recordUsage(r.model, r.usage)
      if (r.stop === 'refusal') throw new AiError('Claude declined this request.', 'refusal')
      const parsed = a.schema.safeParse(r.data)
      if (parsed.success) {
        await db.aiCache.put({ hash: p.hash, feature, date: nowIso(), response: parsed.data })
        return { data: parsed.data, model: r.model, usage: r.usage, cached: false }
      }
    }
  } catch (e) {
    throw mapError(e)
  }
  throw new AiError('Claude answered in an unexpected format. Try again.', 'invalid')
}

/** Pull the last JSON object out of a text answer. */
export function extractJson(text: string): unknown {
  const clean = cleanAiText(text).replace(/```(?:json)?/g, '')
  const end = clean.lastIndexOf('}')
  if (end < 0) return null
  // Walk back to the matching opening brace.
  let depth = 0
  for (let i = end; i >= 0; i--) {
    const ch = clean[i]
    if (ch === '}') depth++
    else if (ch === '{') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(clean.slice(i, end + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

/** Web-search call with JSON in the final text, validated with zod, retried once. */
export async function callSearch<T>(
  feature: string,
  a: { model?: string; system: string; user: string; schema: z.ZodType<T>; maxSearches?: number; maxTokens?: number },
  opts: CallOptions = {},
): Promise<CallResult<T>> {
  const p = await prepare(feature, [a.model, a.system, a.user], opts)
  if (p.hit) return { data: p.hit.response as T, model: a.model ?? '', usage: {}, cached: true }
  const m = a.model || p.s.aiMainModel || DEFAULT_MAIN_MODEL
  let user = a.user
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await transport(p.s.aiKey).searchText({ model: m, system: a.system, user, maxSearches: a.maxSearches ?? 5, maxTokens: a.maxTokens ?? 16000 })
      await recordUsage(r.model, r.usage)
      if (r.stop === 'refusal') throw new AiError('Claude declined this request.', 'refusal')
      const parsed = a.schema.safeParse(extractJson(r.text))
      if (parsed.success) {
        await db.aiCache.put({ hash: p.hash, feature, date: nowIso(), response: parsed.data })
        return { data: parsed.data, model: r.model, usage: r.usage, cached: false }
      }
      user = `${a.user}\n\nYour previous answer was not valid JSON for the schema. Reply with only the JSON object.`
    }
  } catch (e) {
    throw mapError(e)
  }
  throw new AiError('Claude answered in an unexpected format. Try again.', 'invalid')
}
