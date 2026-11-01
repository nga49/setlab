import { useSettings } from '../db/settings'
import type { Gap, PartyPreset } from '../engine/parties'
import { S } from '../strings'
import { GapSuggestions } from '../ai/GapSuggestions'

/** 🔴 gap card: the library cannot fill this phase well. */
export function GapCard({ gap, preset }: { gap: Gap; preset: PartyPreset }) {
  const s = useSettings()
  return (
    <div className="my-1 flex flex-col gap-2 rounded-xl border-2 border-dashed border-rust bg-rust/10 p-3" data-testid="gap-card">
      <p className="text-[14px] font-bold text-ink">
        <span aria-hidden>🔴 </span>
        {gap.label}
      </p>
      <p className="font-mono text-[12px] text-ink-soft">
        {gap.phase}
        {gap.genre ? ` · ${gap.genre}` : ''}
      </p>
      {s.aiKey ? <GapSuggestions gap={gap} preset={preset} /> : <p className="text-[12px] text-ink-soft">🟣 {S.noKeyHint}</p>}
    </div>
  )
}
