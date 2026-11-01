import { generateSets, type GenerateOptions, type SetResult } from './generate'
import { generateParty, type PartyOptions, type PartyPreset, type PartyResult } from './parties'
import type { EngineTrack, ScoreContext } from './types'
import type { WorkerRequest } from './worker'

/** Use the worker for pools larger than this (docs/ENGINE.md §7). */
export const WORKER_THRESHOLD = 200

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (!worker) {
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (e: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
        const p = pending.get(e.data.id)
        if (!p) return
        pending.delete(e.data.id)
        if (e.data.error) p.reject(new Error(e.data.error))
        else p.resolve(e.data.result)
      }
      worker.onerror = () => {
        for (const p of pending.values()) p.reject(new Error('Worker failed'))
        pending.clear()
        worker = null
      }
    } catch {
      worker = null
    }
  }
  return worker
}

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never

function call<T>(msg: WithoutId<WorkerRequest>): Promise<T> | null {
  const w = getWorker()
  if (!w) return null
  const id = nextId++
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
    w.postMessage({ ...msg, id })
  })
}

/** Generate sets, off the main thread when the pool is large. */
export async function runGenerate(library: EngineTrack[], options: GenerateOptions): Promise<SetResult[]> {
  const poolSize = options.poolMode === 'fill' ? library.length : (options.picked?.length ?? 0)
  if (poolSize > WORKER_THRESHOLD) {
    const p = call<SetResult[]>({ type: 'generate', library, options })
    if (p) return p
  }
  return generateSets(library, options)
}

export async function runParty(
  library: EngineTrack[],
  preset: PartyPreset,
  options: PartyOptions,
  ctx: ScoreContext,
  overlapSec: number,
  seed = 1,
): Promise<PartyResult> {
  if (library.length > WORKER_THRESHOLD) {
    const p = call<PartyResult>({ type: 'party', library, preset, options, ctx, overlapSec, seed })
    if (p) return p
  }
  return generateParty(library, preset, options, ctx, overlapSec, seed)
}
