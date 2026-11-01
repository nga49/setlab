/**
 * Claude models and prices for the cost meter (docs/AI.md §1, §3).
 * Source: Anthropic model table (cached 2026-10-06) checked during the build.
 * Prices are USD per million tokens and are APPROXIMATE: check
 * https://www.anthropic.com/pricing before relying on them.
 */

export interface ModelInfo {
  id: string
  label: string
  inputPerM: number
  outputPerM: number
  cacheReadPerM: number
  /** Supports the web_search_20260209 server tool (documented). */
  webSearch: boolean
  /** Server-side refusal fallback ("default" form) is available. */
  fallback: boolean
}

export const MODELS: ModelInfo[] = [
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (fast, cheapest)', inputPerM: 0.1, outputPerM: 0.5, cacheReadPerM: 0.01, webSearch: false, fallback: false },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', inputPerM: 2, outputPerM: 10, cacheReadPerM: 0.2, webSearch: true, fallback: true },
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (default)', inputPerM: 4, outputPerM: 20, cacheReadPerM: 0.2, webSearch: true, fallback: true },
  { id: 'claude-fable-5-1', label: 'Claude Fable 5.1 (most capable, pricey)', inputPerM: 10, outputPerM: 50, cacheReadPerM: 0.25, webSearch: true, fallback: true },
]

export const DEFAULT_FAST_MODEL = 'claude-haiku-5-5'
export const DEFAULT_MAIN_MODEL = 'claude-opus-5-5'
/** Web search server tool: $10 per 1,000 searches. */
export const WEB_SEARCH_USD = 0.01
export const WEB_SEARCH_TOOL = 'web_search_20260209'

export function modelInfo(id: string): ModelInfo {
  return MODELS.find((m) => m.id === id) ?? MODELS.find((m) => m.id === DEFAULT_MAIN_MODEL)!
}

export interface UsageLike {
  input_tokens?: number | null
  output_tokens?: number | null
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
  server_tool_use?: { web_search_requests?: number | null } | null
}

/** Approximate USD cost of one response. */
export function costUsd(model: string, u: UsageLike): number {
  const m = modelInfo(model)
  const input = (u.input_tokens ?? 0) * m.inputPerM + (u.cache_creation_input_tokens ?? 0) * m.inputPerM * 1.25 + (u.cache_read_input_tokens ?? 0) * m.cacheReadPerM
  const output = (u.output_tokens ?? 0) * m.outputPerM
  return (input + output) / 1e6 + (u.server_tool_use?.web_search_requests ?? 0) * WEB_SEARCH_USD
}
