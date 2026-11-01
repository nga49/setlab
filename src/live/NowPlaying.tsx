import type { LibTrack } from '../data/effective'
import { displayTitle } from '../data/effective'
import { musicalName } from '../engine/camelot'
import { cx, Faceplate, KeyChip, Reel, TapeCounter, VuMeter } from '../ui/kit'

/** Tape window: two reels spinning at BPM speed, the track on a teal panel, readouts below. */
export function NowPlaying({ track, gig = false }: { track: LibTrack; gig?: boolean }) {
  const bpm = track.bpm ? Math.round(track.bpm) : null
  return (
    <Faceplate inner="p-3" className={cx(gig && 'shadow-none')}>
      <div className="grid grid-cols-[56px_1fr_56px] items-center gap-2 rounded-xl bg-[#140D09] p-2 shadow-[inset_0_3px_8px_#0B0705]" data-testid="now-playing">
        <Reel spinning bpm={track.bpm} size={56} />
        <div className="flex min-h-[96px] min-w-0 flex-col justify-center rounded-lg bg-teal px-3 py-2 text-paper">
          {!gig ? <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-teal-light">NOW PLAYING</span> : null}
          <span className={cx('truncate font-bold leading-tight', gig ? 'text-[22px]' : 'text-[18px]')}>{displayTitle(track)}</span>
          <span className={cx('truncate text-paper/85', gig ? 'text-[20px]' : 'text-[14px]')}>{track.artist}</span>
        </div>
        <Reel spinning bpm={track.bpm} size={56} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          {!gig ? <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-ink-soft">BPM</span> : null}
          <TapeCounter value={bpm ?? '---'} digits={3} size="lg" label={bpm ? `${bpm} BPM` : 'BPM unknown'} />
        </div>
        <div className="flex flex-col items-end gap-1">
          {!gig ? <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-ink-soft">KEY · {musicalName(track.camelot)}</span> : null}
          <KeyChip camelot={track.camelot} size="xl" estimated={track.sources.camelot === 'estimate'} />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <div className={cx('flex justify-between font-mono font-bold text-ink-soft', gig ? 'text-[20px]' : 'text-[11px] tracking-[0.14em]')}>
          <span>ENERGY {Math.round(track.energy)}</span>
          <span className="truncate pl-2">{track.genre ?? 'genre ?'}</span>
        </div>
        <div className="rounded-md bg-[#140D09] p-1.5">
          <VuMeter value={track.energy} />
        </div>
      </div>
    </Faceplate>
  )
}
