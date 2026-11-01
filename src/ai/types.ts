import type { Confidence } from '../db/types'

/** Output of "Estimate track" (docs/AI.md §2). */
export interface EstimateResult {
  bpm: number | null
  camelot: string | null
  keyName: string | null
  genre: string | null
  energy: number | null
  year: number | null
  confidence: Confidence
  note: string
}
