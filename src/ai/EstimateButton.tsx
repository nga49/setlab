import type { TrackRef } from '../engine/match'
import { useSettings } from '../db/settings'
import { S } from '../strings'
import type { EstimateResult } from './types'
import { estimateBatch, estimateTrack } from './features'
import { useAiCall } from './useAiCall'
import { useToast } from '../ui/Toast'

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
  const { busy, run } = useAiCall()
  const toast = useToast()
  const label = props.batch ? `Estimate all ${props.batch.length}` : 'Estimate'
  if (!s.aiKey) {
    return (
      <span className="inline-flex min-h-12 items-center rounded-lg border border-dashed border-teal-light/50 px-3 text-[12px] text-teal-light" title={S.noKeyHint}>
        🟣 {label} · needs API key
      </span>
    )
  }
  const click = async () => {
    if (props.batch && props.onBatch) {
      const r = await run((o) => estimateBatch(props.batch!, o))
      if (r) {
        props.onBatch(r)
        toast(`🟡 ${r.filter(Boolean).length} estimated`)
      }
      return
    }
    if (!props.track?.title) {
      toast('Type a title first', 'error')
      return
    }
    const r = await run((o) => estimateTrack(props.track!, o))
    if (r) {
      props.onEstimate?.(r)
      toast(`🟡 ${r.bpm ?? '?'} BPM · ${r.camelot ?? '?'} · ${r.confidence} confidence`)
    }
  }
  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      className="piano-key inline-flex min-h-12 items-center gap-1.5 rounded-lg bg-teal px-3 font-mono text-[13px] font-bold text-paper disabled:opacity-60"
      data-testid="estimate"
    >
      🟣 {busy ? 'Asking Claude…' : label}
    </button>
  )
}
