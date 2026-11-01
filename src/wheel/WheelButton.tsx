import { S } from '../strings'
import { useApp } from '../state/app'

/** Floating round knob, bottom-right above the tab bar, on every screen. */
export function WheelButton() {
  const app = useApp()
  return (
    <button
      type="button"
      onClick={() => app.openWheel(null)}
      aria-label={S.openWheel}
      data-testid="wheel-button"
      className="piano-key fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 flex h-16 w-16 items-center justify-center rounded-full
        bg-[radial-gradient(circle_at_35%_30%,#F1ECE1,#9B9384_70%)] shadow-[0_8px_18px_rgb(0_0_0/0.5),inset_0_-3px_0_rgb(0_0_0/0.25)]"
    >
      <span aria-hidden className="relative block h-11 w-11 rounded-full border-2 border-dashed border-[#5B5346]">
        <span className="absolute top-1 left-1/2 h-3 w-1 -translate-x-1/2 rounded-full bg-rust" />
      </span>
    </button>
  )
}
