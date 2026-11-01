import { PencilSimpleIcon, WarningIcon } from '@phosphor-icons/react'
import type { SetResult } from '../engine/generate'
import { EnergySpark, ScoreMeter } from '../ui/Meter'
import { KeyChip, PaperCard, PianoKey, TapeCounter } from '../ui/kit'
import { MODE_LABEL } from './draft'
import { SetList } from './SetList'

export function keyJourney(keys: (string | null)[]): string[] {
  const out: string[] = []
  for (const k of keys) if (k && out[out.length - 1] !== k) out.push(k)
  return out
}

export function bpmRange(r: SetResult): string {
  const b = r.tracks.map((t) => t.bpm).filter((x): x is number => !!x)
  if (!b.length) return '---'
  return `${Math.round(Math.min(...b))} to ${Math.round(Math.max(...b))}`
}

/** One generated version, styled as a cassette J-card. */
export function VersionCard({
  r,
  locks,
  onSwap,
  onBridge,
  onEdit,
  title,
  showList = true,
}: {
  r: SetResult
  locks?: Set<string>
  onSwap?: (i: number) => void
  onBridge?: (i: number) => void
  onEdit?: () => void
  title?: string
  showList?: boolean
}) {
  const m = MODE_LABEL[r.mode]
  const journey = keyJourney(r.tracks.map((t) => t.camelot))
  const minutes = Math.round(r.durationSec / 60)
  return (
    <PaperCard className="flex flex-col gap-3 p-4" >
      <div className="flex items-start justify-between gap-3" data-testid={`version-${r.mode}`}>
        <div className="flex flex-col gap-1.5">
          <h3 className="font-title text-[20px] leading-none text-ink">
            {title ?? (
              <>
                <span aria-hidden>{m.emoji} </span>
                {m.label}
              </>
            )}
          </h3>
          <p className="font-mono text-[12px] text-ink-soft">
            {r.tracks.length} tracks · BPM {bpmRange(r)}
            {r.mode === 'journey' ? ` · ${r.arc.label}` : ''}
          </p>
          <div className="flex items-center gap-2">
            <TapeCounter value={minutes} digits={3} size="sm" label={`${minutes} minutes`} />
            <span className="font-mono text-[12px] text-ink-soft">min</span>
          </div>
        </div>
        <ScoreMeter score={r.total} onPaper />
      </div>

      {journey.length ? (
        <div className="flex flex-wrap items-center gap-1" aria-label="Key journey">
          {journey.slice(0, 10).map((k, i) => (
            <span key={`${k}-${i}`} className="flex items-center gap-1">
              {i > 0 ? <span className="text-[11px] text-ink-soft" aria-hidden>›</span> : null}
              <KeyChip camelot={k} size="sm" />
            </span>
          ))}
          {journey.length > 10 ? <span className="font-mono text-[12px] text-ink-soft">+{journey.length - 10}</span> : null}
        </div>
      ) : null}

      {r.tracks.length > 1 ? (
        <div className="rounded-lg bg-walnut px-2 py-1">
          <EnergySpark energies={r.tracks.map((t) => t.energy)} positions={r.positions} arc={r.arc} />
          <p className="flex justify-between font-mono text-[10px] text-paper-dim">
            <span>energy</span>
            <span>
              <span className="text-mustard">━</span> set · <span className="text-teal-light">┅</span> target · fit {Math.round(r.arcFit)}
            </span>
          </p>
        </div>
      ) : null}

      {r.warnings.length ? (
        <ul className="flex flex-col gap-1" role="status">
          {r.warnings.map((w) => (
            <li key={w} className="flex gap-1.5 rounded-lg bg-rust/15 px-2 py-1.5 text-[13px] text-ink">
              <WarningIcon size={16} className="mt-0.5 shrink-0 text-rust" aria-hidden /> {w}
            </li>
          ))}
        </ul>
      ) : null}

      {showList ? (
        <SetList tracks={r.tracks} transitions={r.transitions} phases={r.phases} locks={locks} onSwap={onSwap} onBridge={onBridge} testId={`setlist-${r.mode}`} />
      ) : null}

      {onEdit ? (
        <PianoKey tone="alu" onClick={onEdit} data-testid={`edit-${r.mode}`}>
          <PencilSimpleIcon size={18} aria-hidden /> Edit &amp; save
        </PianoKey>
      ) : null}
    </PaperCard>
  )
}
