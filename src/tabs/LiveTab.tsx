import { useMemo, useState } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useApp } from '../state/app'
import { useLibrary } from '../data/LibraryProvider'
import type { LibTrack } from '../data/effective'
import { searchTracks } from '../data/search'
import { setSetting, useSettings } from '../db/settings'
import type { Direction } from '../engine/types'
import { S } from '../strings'
import { Chip, cx, EmptyState, PianoKey, SectionLabel } from '../ui/kit'
import { TrackRow } from '../ui/TrackRow'
import { NowPlaying } from '../live/NowPlaying'
import { NextList } from '../live/NextList'
import { RequestSheet } from '../live/RequestSheet'
import { BridgeSheet } from '../live/BridgeSheet'
import { useLiveSession } from '../live/session'
import { useWakeLock } from '../live/useWakeLock'

type Filter = Direction | 'any'

export function LiveTab() {
  const app = useApp()
  const lib = useLibrary()
  const settings = useSettings()
  const { session, played, play, undo, end } = useLiveSession()
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [dir, setDir] = useState<Filter>('any')
  const [sameGenre, setSameGenre] = useState(false)
  const [request, setRequest] = useState(false)
  const [bridge, setBridge] = useState(false)
  const gig = settings.gigMode
  useWakeLock(gig)

  const now = app.nowPlayingId ? lib.byId.get(app.nowPlayingId) : undefined
  const results = useMemo(() => (q.trim() ? searchTracks(lib.owned, q, 12) : []), [lib.owned, q])
  const next = useMemo(() => {
    if (!now) return []
    const exclude = new Set(played)
    exclude.add(now.id)
    return lib.graph().nextTracks(now.id, { direction: dir === 'any' ? 'any' : dir, sameGenre, exclude }, gig ? 3 : 5)
  }, [now, played, dir, sameGenre, lib, gig])

  const choose = async (t: LibTrack) => {
    await play(t)
    setQ('')
    setSearching(false)
  }
  const minutes = session ? Math.round((Date.now() - Date.parse(session.start)) / 60000) : 0

  const search = (
    <div className="flex flex-col gap-2">
      <label className="flex min-h-14 items-center gap-2 rounded-xl bg-walnut-2 px-3">
        <MagnifyingGlassIcon size={22} className="text-paper-dim" aria-hidden />
        <input
          value={q}
          autoFocus={!now}
          onChange={(e) => setQ(e.target.value)}
          placeholder={now ? 'Change track…' : "What's playing?"}
          aria-label="Search now playing"
          className="h-14 min-w-0 flex-1 bg-transparent text-[18px] text-paper outline-none placeholder:text-paper-dim/70"
          data-testid="live-search"
        />
      </label>
      {results.length ? (
        <div className="dashed-rows-dark rounded-xl bg-walnut-2/60" data-testid="live-results">
          {results.map((t) => (
            <TrackRow key={t.id} track={t} onClick={() => choose(t)} testId={`live-pick-${t.id}`} />
          ))}
        </div>
      ) : null}
    </div>
  )

  return (
    <section aria-labelledby="h-live" className={cx('flex flex-col gap-4', gig && 'gap-5')}>
      <div className="flex items-center justify-between">
        <h1 id="h-live" className="font-title text-[28px] leading-none text-paper">
          {S.titles.live}
        </h1>
        <button
          type="button"
          role="switch"
          aria-checked={gig}
          onClick={() => setSetting('gigMode', !gig)}
          className={cx('piano-key flex min-h-12 items-center gap-2 rounded-full border px-4 font-mono text-[14px] font-bold', gig ? 'border-mustard bg-mustard text-ink' : 'border-walnut-3 text-paper-dim')}
          data-testid="gig-toggle"
        >
          <span aria-hidden>{gig ? '●' : '○'}</span> GIG
        </button>
      </div>

      {!now || (searching && !gig) ? search : null}

      {now ? (
        <>
          <NowPlaying track={now} gig={gig} />
          <div className={cx('grid gap-2', gig ? 'grid-cols-1' : 'grid-cols-[1fr_1.5fr_1fr_1fr]')}>
            {!gig ? (
              <PianoKey onClick={undo} aria-label="Back to the previous track" disabled={!session || session.plays.length < 2}>
                ◀◀
              </PianoKey>
            ) : null}
            <PianoKey tone="rust" size="lg" onClick={() => setRequest(true)} data-testid="request" className={gig ? 'min-h-16 text-[20px]' : ''}>
              ▶ Request
            </PianoKey>
            {!gig ? (
              <>
                <PianoKey onClick={() => setBridge(true)} aria-label="Bridge finder" data-testid="open-bridge">
                  ⇄
                </PianoKey>
                <PianoKey onClick={() => setSearching((s) => !s)} aria-label="Change now playing" aria-pressed={searching}>
                  ⏏
                </PianoKey>
              </>
            ) : null}
          </div>

          {!gig ? (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Next track filters">
              <Chip active={dir === 'up'} onClick={() => setDir(dir === 'up' ? 'any' : 'up')}>⬆️ Up</Chip>
              <Chip active={dir === 'flat'} onClick={() => setDir(dir === 'flat' ? 'any' : 'flat')}>➡️ Same</Chip>
              <Chip active={dir === 'down'} onClick={() => setDir(dir === 'down' ? 'any' : 'down')}>⬇️ Down</Chip>
              <Chip active={sameGenre} onClick={() => setSameGenre(!sameGenre)}>Same genre</Chip>
            </div>
          ) : null}

          <section aria-label="Next tracks" className="flex flex-col gap-1">
            <SectionLabel className={gig ? 'text-[16px]' : ''}>Next · top {gig ? 3 : 5}</SectionLabel>
            {next.length ? (
              <NextList items={next} onPick={(r) => choose(r.track as LibTrack)} gig={gig} testId="next-list" />
            ) : (
              <p className="text-[15px] text-paper-dim">No compatible track left. Try another filter or the wheel.</p>
            )}
          </section>

          {!gig && session ? (
            <div className="flex items-center justify-between rounded-xl bg-walnut-2/50 px-3 py-2 font-mono text-[13px] text-paper-dim">
              <span>
                Session · {session.plays.length} tracks · {minutes} min
              </span>
              <button type="button" onClick={end} className="min-h-12 px-2 underline" data-testid="end-session">
                end
              </button>
            </div>
          ) : null}
        </>
      ) : !lib.owned.length ? (
        <EmptyState title={S.emptyLibrary} hint={S.emptyLibraryHint} />
      ) : (
        <p className="text-[15px] text-paper-dim">Search the track that is playing. The best next tracks show up here.</p>
      )}

      {request ? <RequestSheet open onClose={() => setRequest(false)} nowId={now?.id ?? null} played={played} onPlay={choose} /> : null}
      {bridge ? <BridgeSheet open onClose={() => setBridge(false)} initialA={now?.id ?? null} /> : null}
    </section>
  )
}
