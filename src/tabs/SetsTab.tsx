import { S } from '../strings'
import { useApp } from '../state/app'
import { cx } from '../ui/kit'
import { Organizer } from '../sets/Organizer'
import { PartyGenerator } from '../sets/PartyGenerator'
import { SavedSets } from '../sets/SavedSets'
import { SetEditor } from '../sets/SetEditor'

const SUBS = [
  { id: 'organizer', label: '🎛️ Organizer' },
  { id: 'party', label: '🎉 Party' },
  { id: 'saved', label: '📼 Saved' },
] as const

export function SetsTab() {
  const app = useApp()
  const sub = SUBS.some((s) => s.id === app.sub) ? app.sub : 'organizer'
  return (
    <section aria-labelledby="h-sets" className="flex flex-col gap-4">
      <h1 id="h-sets" className="font-title text-[28px] leading-none text-paper">{S.titles.sets}</h1>
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-walnut-deep/70 p-1.5" role="tablist" aria-label="Sets sections">
        {SUBS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={sub === s.id}
            onClick={() => app.go('sets', s.id)}
            data-testid={`sets-${s.id}`}
            className={cx(
              'piano-key min-h-12 rounded-xl text-[14px] font-bold',
              sub === s.id
                ? 'bg-gradient-to-b from-[#F1ECE1] to-[#C9C2B4] text-ink shadow-[inset_0_-4px_0_#8A8274]'
                : 'text-paper-dim',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      {sub === 'organizer' && <Organizer />}
      {sub === 'party' && <PartyGenerator />}
      {sub === 'saved' && <SavedSets />}
      <SetEditor />
    </section>
  )
}
