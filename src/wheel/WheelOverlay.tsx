import { useApp } from '../state/app'
import { S } from '../strings'

/** Phase 0 placeholder: replaced by the full rotary-dial wheel in Phase 2. */
export default function WheelOverlay() {
  const app = useApp()
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-walnut" role="dialog" aria-modal="true" aria-label={S.titles.wheel}>
      <p className="font-title text-2xl text-paper">{S.titles.wheel}</p>
      <button type="button" className="piano-key min-h-12 rounded-full bg-walnut-2 px-6" onClick={app.closeWheel}>
        {S.close}
      </button>
    </div>
  )
}
