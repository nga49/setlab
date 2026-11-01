import { type ReactNode, useState } from 'react'
import { ArrowsLeftRightIcon, LinkSimpleIcon, LockSimpleIcon } from '@phosphor-icons/react'
import type { EngineTrack, TransitionResult } from '../engine/types'
import { displayTitle } from '../data/effective'
import { cx, formatBpm, KeyChip, TransitionDot } from '../ui/kit'

/**
 * Track list on a tape J-card: numbered rows "01 · Track" with a coloured dot per
 * transition (tap for the reason). 🔴 transitions get Swap and Bridge buttons.
 */
export function SetList({
  tracks,
  transitions,
  phases,
  locks,
  onSwap,
  onBridge,
  paper = true,
  testId,
  insertBefore,
}: {
  tracks: EngineTrack[]
  transitions: TransitionResult[]
  phases?: string[]
  locks?: Set<string>
  onSwap?: (i: number) => void
  onBridge?: (i: number) => void
  paper?: boolean
  testId?: string
  /** Render extra content (e.g. party gap cards) before track i; i === tracks.length renders at the end. */
  insertBefore?: (i: number) => ReactNode
}) {
  const [open, setOpen] = useState<number | null>(null)
  const ink = paper ? 'text-ink' : 'text-paper'
  const soft = paper ? 'text-ink-soft' : 'text-paper-dim'
  return (
    <ol className="flex flex-col" data-testid={testId}>
      {tracks.map((t, i) => {
        const tr = i > 0 ? transitions[i - 1] : undefined
        return (
          <li key={`${t.id}-${i}`}>
            {insertBefore?.(i)}
            {tr ? (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className={cx('flex min-h-9 w-full items-center gap-2 pl-8 text-left', soft)}
                  data-testid="transition-dot"
                  data-color={tr.color}
                >
                  <TransitionDot score={tr.score} size="sm" />
                  <span className="truncate font-mono text-[12px]">
                    {Math.round(tr.score)} · {tr.reasons[0]}
                  </span>
                </button>
                {open === i ? (
                  <p className={cx('mb-1 ml-8 rounded-lg px-2 py-1 font-mono text-[12px]', paper ? 'bg-ink/8' : 'bg-walnut-3/60', ink)}>{tr.reasons.join(' · ')}</p>
                ) : null}
                {tr.color === 'bad' && (onSwap || onBridge) ? (
                  <div className="mb-1 ml-8 flex gap-2">
                    {onSwap ? (
                      <button type="button" onClick={() => onSwap(i)} className="piano-key flex min-h-12 items-center gap-1.5 rounded-lg bg-rust px-3 font-mono text-[13px] font-bold text-paper" data-testid="swap">
                        <ArrowsLeftRightIcon size={16} aria-hidden /> Swap
                      </button>
                    ) : null}
                    {onBridge ? (
                      <button type="button" onClick={() => onBridge(i)} className="piano-key flex min-h-12 items-center gap-1.5 rounded-lg bg-teal px-3 font-mono text-[13px] font-bold text-paper" data-testid="bridge">
                        <LinkSimpleIcon size={16} aria-hidden /> Bridge
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="flex min-h-12 items-center gap-2">
              <span className={cx('w-6 shrink-0 font-mono text-[13px]', soft)}>{String(i + 1).padStart(2, '0')}</span>
              <KeyChip camelot={t.camelot} size="sm" />
              <span className="min-w-0 flex-1">
                <span className={cx('block truncate text-[14px] font-bold', ink)}>
                  {locks?.has(t.id) ? <LockSimpleIcon size={13} weight="fill" className="mr-1 inline text-rust" aria-label="locked" /> : null}
                  {displayTitle(t)}
                </span>
                <span className={cx('block truncate text-[12px]', soft)}>
                  {t.artist}
                  {phases?.[i] ? ` · ${phases[i]}` : ''}
                </span>
              </span>
              <span className={cx('font-mono text-[13px] font-bold', ink)}>{formatBpm(t.bpm)}</span>
              <span className={cx('w-5 text-right font-mono text-[12px]', soft)} aria-label={`energy ${t.energy}`}>
                E{Math.round(t.energy)}
              </span>
            </div>
          </li>
        )
      })}
      {insertBefore ? <li>{insertBefore(tracks.length)}</li> : null}
    </ol>
  )
}
