/// <reference lib="webworker" />
import { generateSets, type GenerateOptions } from './generate'
import { generateParty, type PartyOptions, type PartyPreset } from './parties'
import type { EngineTrack, ScoreContext } from './types'

/** Runs heavy set generation off the main thread (pools > 200 tracks). */

export type WorkerRequest =
  | { id: number; type: 'generate'; library: EngineTrack[]; options: GenerateOptions }
  | { id: number; type: 'party'; library: EngineTrack[]; preset: PartyPreset; options: PartyOptions; ctx: ScoreContext; overlapSec: number; seed: number }

declare const self: DedicatedWorkerGlobalScope

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const m = e.data
  try {
    if (m.type === 'generate') self.postMessage({ id: m.id, result: generateSets(m.library, m.options) })
    else self.postMessage({ id: m.id, result: generateParty(m.library, m.preset, m.options, m.ctx, m.overlapSec, m.seed) })
  } catch (err) {
    self.postMessage({ id: m.id, error: err instanceof Error ? err.message : String(err) })
  }
}
