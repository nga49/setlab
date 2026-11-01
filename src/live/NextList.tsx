import type { Ranked } from '../engine/graph'
import { displayTitle } from '../data/effective'
import { cx, ScoreText } from '../ui/kit'
import { keyColor } from '../engine/camelot'

/** Short "why" line: "+1 key · BPM −1 · energy +1". */
export function whyLine(reasons: string[]): string {
  const [key, bpm, , energy] = reasons
  const k = key?.split(' · ')[1] ?? key ?? ''
  return [k ? (k.startsWith('+') || k.startsWith('−') ? `${k} key` : k) : '', bpm ?? '', energy?.replace(/ [✓✕]$/, '') ?? '']
    .filter(Boolean)
    .join(' · ')
}

/** Big, glanceable suggestion rows (≥ 56 px). */
export function NextList({ items, onPick, gig = false, testId }: { items: Ranked[]; onPick: (r: Ranked) => void; gig?: boolean; testId?: string }) {
  return (
    <ol className="dashed-rows-dark flex flex-col" data-testid={testId}>
      {items.map((r, i) => (
        <li key={r.track.id}>
          <button
            type="button"
            onClick={() => onPick(r)}
            className={cx('piano-key flex w-full items-center gap-3 px-1 text-left', gig ? 'min-h-[76px]' : 'min-h-16')}
            data-testid={`next-${i}`}
            aria-label={`Play next: ${r.track.title} by ${r.track.artist}, key ${r.track.camelot ?? 'unknown'}, ${r.track.bpm ?? 'unknown'} BPM, score ${Math.round(r.score)}`}
          >
            <span
              className={cx('w-14 shrink-0 text-center font-mono font-bold', gig ? 'text-[26px]' : 'text-[22px]')}
              style={{ color: keyColor(r.track.camelot) }}
            >
              {r.track.camelot ?? '?'}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cx('block truncate font-bold text-paper', gig ? 'text-[21px]' : 'text-[16px]')}>{displayTitle(r.track)}</span>
              <span className={cx('block truncate text-paper-dim', gig ? 'text-[20px]' : 'text-[13px]')}>
                {gig ? `${r.track.bpm ? Math.round(r.track.bpm) : '?'} BPM · E${Math.round(r.track.energy)}` : whyLine(r.transition.reasons)}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end">
              <span className={cx('font-mono font-bold text-mustard', gig ? 'text-[22px]' : 'text-[17px]')}>{r.track.bpm ? Math.round(r.track.bpm) : '---'}</span>
              <ScoreText score={r.score} className={gig ? 'text-[18px]' : 'text-[13px]'} />
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}
