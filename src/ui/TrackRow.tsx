import { memo, type ReactNode } from 'react'
import type { LibTrack } from '../data/effective'
import { displayTitle } from '../data/effective'
import { cx, formatBpm, KeyChip } from './kit'

/** One track as a row: key chip, title/artist, BPM, energy. Min 56 px tall. */
export const TrackRow = memo(function TrackRow({
  track,
  index,
  onClick,
  right,
  selected,
  dark = true,
  testId,
}: {
  track: Pick<LibTrack, 'id' | 'artist' | 'title' | 'remix' | 'camelot' | 'bpm' | 'energy'> & { estimated?: boolean; status?: string }
  index?: number
  onClick?: () => void
  right?: ReactNode
  selected?: boolean
  dark?: boolean
  testId?: string
}) {
  const body = (
    <>
      {index != null ? (
        <span className={cx('w-7 shrink-0 font-mono text-[13px]', dark ? 'text-paper-dim' : 'text-ink-soft')}>{String(index).padStart(2, '0')}</span>
      ) : null}
      <KeyChip camelot={track.camelot} size="sm" estimated={track.estimated} />
      <span className="min-w-0 flex-1 text-left">
        <span className={cx('block truncate text-[15px] font-bold', dark ? 'text-paper' : 'text-ink')}>{displayTitle(track)}</span>
        <span className={cx('block truncate text-[13px]', dark ? 'text-paper-dim' : 'text-ink-soft')}>
          {track.artist}
          {track.status === 'wishlist' ? ' · wishlist' : ''}
        </span>
      </span>
      <span className={cx('shrink-0 font-mono text-[15px] font-bold', dark ? 'text-mustard' : 'text-ink')}>{formatBpm(track.bpm)}</span>
      {right}
    </>
  )
  const cls = cx(
    'flex min-h-14 w-full items-center gap-2.5 px-2 py-1.5',
    selected && (dark ? 'bg-mustard/15' : 'bg-mustard/30'),
    onClick && 'piano-key',
  )
  return onClick ? (
    <button type="button" onClick={onClick} className={cls} data-testid={testId} aria-pressed={selected}>
      {body}
    </button>
  ) : (
    <div className={cls} data-testid={testId}>
      {body}
    </div>
  )
})
