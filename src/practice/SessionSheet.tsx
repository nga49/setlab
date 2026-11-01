import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Rating, RatingValue, Session } from '../db/types'
import { useLibrary } from '../data/LibraryProvider'
import { displayTitle } from '../data/effective'
import { heuristicEnergy } from '../engine/energy'
import { transitionScore } from '../engine/score'
import type { EngineTrack } from '../engine/types'
import { Sheet } from '../ui/Sheet'
import { cx, KeyChip, PianoKey, TransitionDot } from '../ui/kit'
import { useToast } from '../ui/Toast'
import { rateTransition, RATING_EMOJI } from './ratings'

function sessionTracks(s: Session, byId: Map<string, EngineTrack>): EngineTrack[] {
  return s.plays.map((p) => {
    const t = byId.get(p.trackId)
    if (t) return t
    const snap = s.snapshots?.[p.trackId]
    return {
      id: p.trackId,
      artist: snap?.artist ?? '?',
      title: snap?.title ?? 'Unknown track',
      remix: null,
      genre: null,
      bpm: snap?.bpm ?? null,
      camelot: snap?.camelot ?? null,
      energy: heuristicEnergy({ genre: null, bpm: snap?.bpm ?? null }),
      lengthSec: null,
      year: null,
      tags: [],
    }
  })
}

/** Transitions played in a session, each rated 👎 / 👌 / 🔥 with an optional note. */
export function SessionSheet({ session, onClose }: { session: Session; onClose: () => void }) {
  const lib = useLibrary()
  const toast = useToast()
  const ratings = useLiveQuery(() => db.ratings.toArray(), [], [] as Rating[])
  const byKey = new Map(ratings.map((r) => [r.key, r]))
  const tracks = sessionTracks(session, lib.byId as Map<string, EngineTrack>)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState(false)

  const rate = async (a: EngineTrack, b: EngineTrack, v: RatingValue) => {
    await rateTransition(a, b, v, lib.ctx, notes[`${a.id}>${b.id}`])
  }

  return (
    <Sheet open onClose={onClose} title={session.kind === 'live' ? 'Live session' : 'Practice'} full testId="session-sheet">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[13px] text-paper-dim">
          {new Date(session.start).toLocaleString()} · {session.plays.length} tracks
        </p>
        <ol className="flex flex-col">
          {tracks.map((t, i) => {
            const prev = i > 0 ? tracks[i - 1]! : null
            const key = prev ? `${prev.id}>${t.id}` : ''
            const r = prev ? byKey.get(key) : undefined
            const tr = prev ? transitionScore(prev, t, { ...lib.ctx, ratings: undefined }) : null
            return (
              <li key={`${t.id}-${i}`} className="flex flex-col">
                {prev && tr ? (
                  <div className="my-1 ml-6 flex flex-col gap-1.5 rounded-xl bg-walnut-2/60 p-2" data-testid="rate-row">
                    <div className="flex items-center gap-2">
                      <TransitionDot score={tr.score} size="sm" />
                      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-paper-dim">{tr.reasons.slice(0, 2).join(' · ')}</span>
                    </div>
                    <div className="flex items-center gap-1.5" role="group" aria-label="Rate this transition">
                      {([-1, 0, 1] as RatingValue[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => rate(prev, t, v)}
                          aria-pressed={r?.rating === v}
                          aria-label={v === 1 ? 'Fire' : v === 0 ? 'OK' : 'Bad'}
                          className={cx('piano-key flex h-12 w-14 items-center justify-center rounded-lg text-[22px]', r?.rating === v ? 'bg-mustard' : 'bg-walnut-3/60')}
                          data-testid={`rate-${v}`}
                        >
                          {RATING_EMOJI[v]}
                        </button>
                      ))}
                      <input
                        value={notes[key] ?? r?.note ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [key]: e.target.value }))}
                        onBlur={() => r && rateTransition(prev, t, r.rating, lib.ctx, notes[key])}
                        placeholder="note (loop the intro…)"
                        aria-label="Note"
                        className="h-12 min-w-0 flex-1 rounded-lg bg-walnut px-2 text-[14px] text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard"
                      />
                    </div>
                  </div>
                ) : null}
                <div className="flex min-h-12 items-center gap-2">
                  <span className="w-6 font-mono text-[12px] text-paper-dim">{String(i + 1).padStart(2, '0')}</span>
                  <KeyChip camelot={t.camelot} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-paper">{displayTitle(t)}</span>
                  <span className="font-mono text-[12px] text-paper-dim">{new Date(session.plays[i]!.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </li>
            )
          })}
        </ol>
        <PianoKey
          tone="walnut"
          onClick={async () => {
            if (!confirm) return setConfirm(true)
            await db.sessions.delete(session.id)
            toast('Session deleted')
            onClose()
          }}
        >
          {confirm ? 'Tap again to delete' : 'Delete session'}
        </PianoKey>
      </div>
    </Sheet>
  )
}
