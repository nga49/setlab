import { type ButtonHTMLAttributes, type ReactNode, memo } from 'react'
import { CHIP_INK, keyColor, musicalName } from '../engine/camelot'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

// ---------------------------------------------------------------------------
// Piano-key button: aluminium (default), rust (main action) or walnut (quiet).

type KeyTone = 'alu' | 'rust' | 'walnut' | 'mustard'
const TONES: Record<KeyTone, string> = {
  alu: 'bg-gradient-to-b from-[#F1ECE1] to-[#C9C2B4] text-ink shadow-[inset_0_-5px_0_#8A8274,0_2px_0_#4A3A2C]',
  rust: 'bg-gradient-to-b from-[#C9563A] to-[#A63F25] text-paper shadow-[inset_0_-5px_0_#6E2816,0_2px_0_#4A1B0F]',
  walnut: 'bg-walnut-2 text-paper shadow-[inset_0_-4px_0_#1E140E,inset_0_1px_0_rgb(255_255_255/0.06)]',
  mustard: 'bg-gradient-to-b from-[#F0B355] to-[#D8922C] text-ink shadow-[inset_0_-5px_0_#9C6417,0_2px_0_#4A3A2C]',
}

export interface PianoKeyProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: KeyTone
  size?: 'md' | 'lg'
}

export function PianoKey({ tone = 'alu', size = 'md', className, children, ...rest }: PianoKeyProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'piano-key inline-flex items-center justify-center gap-2 rounded-t-md rounded-b-[10px] px-3 font-mono font-bold uppercase tracking-wide select-none',
        'active:shadow-[inset_0_-2px_0_rgb(0_0_0/0.35)] disabled:opacity-45 disabled:pointer-events-none',
        size === 'lg' ? 'min-h-14 text-[15px]' : 'min-h-12 text-[13px]',
        TONES[tone],
        className,
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Camelot key chip: a small rectangular "tape counter" tag in the key colour.

export const KeyChip = memo(function KeyChip({
  camelot,
  size = 'md',
  showName = false,
  estimated = false,
  className,
}: {
  camelot: string | null | undefined
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showName?: boolean
  estimated?: boolean
  className?: string
}) {
  const sizes = {
    sm: 'h-6 min-w-9 px-1.5 text-[12px]',
    md: 'h-8 min-w-11 px-2 text-[15px]',
    lg: 'h-10 min-w-14 px-2.5 text-[19px]',
    xl: 'h-14 min-w-20 px-3 text-[28px]',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center justify-center gap-1 rounded-[4px] font-mono font-bold leading-none shadow-[inset_0_-2px_0_rgb(0_0_0/0.25)]',
        sizes[size],
        className,
      )}
      style={{ background: keyColor(camelot), color: CHIP_INK }}
      aria-label={camelot ? `Key ${camelot} (${musicalName(camelot)})${estimated ? ', estimated' : ''}` : 'Key unknown'}
    >
      {camelot ?? '?'}
      {showName && camelot ? <span className="font-medium opacity-80">· {musicalName(camelot)}</span> : null}
      {estimated ? <span aria-hidden>~</span> : null}
    </span>
  )
})

// ---------------------------------------------------------------------------
// Toggle chip (filters, modes). Min 48 px tall.

export function Chip({
  active,
  onClick,
  children,
  className,
  ariaLabel,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cx(
        'piano-key inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-[14px] whitespace-nowrap',
        active
          ? 'border-mustard bg-mustard font-bold text-ink'
          : 'border-walnut-3 bg-walnut-2/60 text-paper hover:border-paper-dim/60',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Mechanical tape counter (duration, track numbers, BPM).

export function TapeCounter({
  value,
  digits = 3,
  size = 'md',
  label,
  className,
}: {
  value: string | number
  digits?: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}) {
  const pad = typeof value === 'number' ? '0' : ' '
  const s = String(value).padStart(digits, pad).slice(-Math.max(digits, String(value).length))
  const cell = {
    sm: 'h-7 w-5 text-[16px]',
    md: 'h-11 w-8 text-[26px]',
    lg: 'h-16 w-11 text-[44px]',
  }[size]
  return (
    <span className={cx('inline-flex gap-[3px]', className)} role="img" aria-label={label ?? String(value)}>
      {s.split('').map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className={cx(
            'flex items-center justify-center rounded-[5px] font-mono font-bold text-mustard',
            'bg-[linear-gradient(#0F0A07,#2A1D14_50%,#0F0A07)] shadow-[inset_0_0_0_1px_#5A4434]',
            cell,
          )}
        >
          {ch === ' ' ? '' : ch}
        </span>
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------
// VU meter: 10 LED segments for energy 1 to 10.

export function VuMeter({ value, className, label = 'Energy' }: { value: number; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(10, Math.round(value)))
  return (
    <span className={cx('flex gap-[3px]', className)} role="meter" aria-valuemin={1} aria-valuemax={10} aria-valuenow={v} aria-label={`${label} ${v} of 10`}>
      {Array.from({ length: 10 }, (_, i) => {
        const on = i < v
        const color = i < 5 ? 'bg-olive' : i < 8 ? 'bg-mustard' : 'bg-rust'
        return <span key={i} aria-hidden className={cx('h-3 flex-1 rounded-[2px]', on ? color : 'bg-walnut-3')} />
      })}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Tape reel. Spins while playing; speed follows BPM.

export function Reel({ spinning, bpm, size = 64 }: { spinning?: boolean; bpm?: number | null; size?: number }) {
  const period = bpm && bpm > 0 ? Math.max(0.6, Math.min(4, 240 / bpm)) : 2
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      className={spinning ? 'reel-spin' : undefined}
      style={{ ['--reel-period' as string]: `${period}s` }}
    >
      <circle cx="32" cy="32" r="30" fill="#3A281C" stroke="#8A8274" strokeWidth="3" />
      <circle cx="32" cy="32" r="21" fill="#5A4434" />
      <circle cx="32" cy="32" r="9" fill="#E8A33D" />
      <circle cx="32" cy="32" r="4" fill="#2B1D14" />
      {[0, 120, 240].map((a) => (
        <rect key={a} x="30" y="11" width="4" height="10" rx="1.5" fill="#2B1D14" transform={`rotate(${a} 32 32)`} />
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Transition score dot: colour + symbol, never colour alone.

export type ScoreColor = 'good' | 'ok' | 'bad'
export function scoreColor(score: number): ScoreColor {
  return score >= 75 ? 'good' : score >= 50 ? 'ok' : 'bad'
}
const DOT = {
  good: { sym: '✓', cls: 'bg-good text-paper', label: 'great' },
  ok: { sym: '~', cls: 'bg-ok text-ink', label: 'ok' },
  bad: { sym: '✕', cls: 'bg-bad text-paper', label: 'avoid' },
}
export function TransitionDot({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const c = scoreColor(score)
  const d = DOT[c]
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-mono font-bold',
        size === 'sm' ? 'h-5 w-5 text-[11px]' : 'h-7 w-7 text-[13px]',
        d.cls,
      )}
      aria-label={`Transition ${Math.round(score)} of 100, ${d.label}`}
      role="img"
    >
      <span aria-hidden>{d.sym}</span>
    </span>
  )
}

export function ScoreText({ score, className }: { score: number; className?: string }) {
  const c = scoreColor(score)
  const color = c === 'good' ? 'text-[#9BCB9E]' : c === 'ok' ? 'text-mustard' : 'text-[#E58A70]'
  const sym = c === 'good' ? '✓' : c === 'ok' ? '~' : '✕'
  return <span className={cx('font-mono font-bold', color, className)}>{sym}{Math.round(score)}</span>
}

// ---------------------------------------------------------------------------
// Containers

/** Double-bezel walnut panel: outer shell + inner core. */
export function Panel({ children, className, inner }: { children: ReactNode; className?: string; inner?: string }) {
  return (
    <div className={cx('rounded-[20px] bg-walnut-deep/70 p-1.5 shadow-[0_10px_24px_rgb(10_6_3/0.45)]', className)}>
      <div className={cx('rounded-[15px] bg-walnut-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]', inner)}>{children}</div>
    </div>
  )
}

/** Brushed aluminium faceplate in a walnut bezel. */
export function Faceplate({ children, className, inner }: { children: ReactNode; className?: string; inner?: string }) {
  return (
    <div className={cx('rounded-[20px] bg-[linear-gradient(#4A3527,#2F2117)] p-1.5 shadow-[0_12px_26px_rgb(10_6_3/0.5)]', className)}>
      <div className={cx('brushed rounded-[15px] shadow-[inset_0_1px_0_rgb(255_255_255/0.5)]', inner)}>{children}</div>
    </div>
  )
}

/** Paper J-card for track lists. */
export function PaperCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('paper rounded-[14px] shadow-[0_6px_16px_rgb(10_6_3/0.35)]', className)}>{children}</div>
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cx('font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-paper-dim', className)}>{children}</h2>
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-walnut-3 px-5 py-8 text-center">
      {icon ? <div className="text-mustard" aria-hidden>{icon}</div> : null}
      <p className="text-[17px] font-bold text-paper">{title}</p>
      {hint ? <p className="max-w-[34ch] text-[14px] text-paper-dim">{hint}</p> : null}
      {action}
    </div>
  )
}

export function SourceBadge({ source }: { source: 'rekordbox' | 'estimate' | 'manual' | 'heuristic' | 'demo' | 'none' | undefined }) {
  const map = {
    rekordbox: { t: '🟢', l: 'from rekordbox' },
    demo: { t: '🧪', l: 'demo data' },
    estimate: { t: '🟡', l: 'AI estimate' },
    manual: { t: '✏️', l: 'edited by you' },
    heuristic: { t: '≈', l: 'heuristic guess' },
    none: { t: '·', l: 'unknown' },
  }
  const m = map[source ?? 'none']
  return (
    <span className="inline-flex min-w-5 justify-center text-[12px]" title={m.l} aria-label={m.l} role="img">
      {m.t}
    </span>
  )
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '--:--'
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}

export function formatBpm(bpm: number | null | undefined): string {
  if (bpm == null) return '---'
  return Number.isInteger(bpm) ? String(bpm) : bpm.toFixed(1)
}
