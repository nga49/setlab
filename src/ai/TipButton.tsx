import { useState } from 'react'
import { useSettings } from '../db/settings'
import type { EngineTrack } from '../engine/types'
import { cx } from '../ui/kit'
import { explainTransition } from './features'
import { useAiCall } from './useAiCall'

/** Optional 💡 mixing tip for a transition (fast model). Hidden without an API key. */
export function TipButton({ a, b, reasons, paper }: { a: EngineTrack; b: EngineTrack; reasons: string[]; paper?: boolean }) {
  const s = useSettings()
  const { busy, run } = useAiCall()
  const [tip, setTip] = useState<string | null>(null)
  if (!s.aiKey) return null
  if (tip) return <p className={cx('rounded-lg px-2 py-1 text-[13px]', paper ? 'bg-teal/15 text-ink' : 'bg-teal/40 text-paper')}>💡 {tip}</p>
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => setTip(await run((o) => explainTransition(a, b, reasons, o)))}
      className={cx('min-h-11 self-start rounded-lg px-2 font-mono text-[12px] font-bold underline', paper ? 'text-teal' : 'text-teal-light')}
    >
      💡 {busy ? 'Asking…' : 'Mixing tip'}
    </button>
  )
}
