import type { TrackRef } from '../engine/match'
import { useSettings } from '../db/settings'
import { S } from '../strings'
import type { EstimateResult } from './types'

/**
 * 🟣 Estimate BPM / key / genre / energy for a named track (or a batch of up to 20).
 * Without an API key it shows the "add your key" hint and does nothing.
 */
export function EstimateButton(props: {
  track?: TrackRef
  onEstimate?: (e: EstimateResult) => void
  batch?: TrackRef[]
  onBatch?: (list: (EstimateResult | null)[]) => void
}) {
  const s = useSettings()
  if (!s.aiKey) {
    return (
      <span className="inline-flex min-h-12 items-center rounded-lg border border-dashed border-teal-light/50 px-3 text-[12px] text-teal-light" title={S.noKeyHint}>
        🟣 {props.batch ? 'Estimate all' : 'Estimate'} · needs API key
      </span>
    )
  }
  return null
}
