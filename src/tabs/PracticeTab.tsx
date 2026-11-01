import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid } from '../db/db'
import type { Rating, SavedSet, Session } from '../db/types'
import { S } from '../strings'
import { EmptyState, PianoKey, SectionLabel } from '../ui/kit'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'
import { SessionSheet } from '../practice/SessionSheet'
import { ExportSheet } from '../practice/ExportSheet'
import { useApp } from '../state/app'

/** Log a practice session from a saved set: plays in set order, spaced by track length. */
export async function logPractice(set: SavedSet, overlapSec: number): Promise<Session> {
  const start = Date.now()
  let t = start
  const plays = set.items.map((it) => {
    const at = new Date(t).toISOString()
    t += Math.max(60, (it.lengthSec ?? 240) - overlapSec) * 1000
    return { trackId: it.trackId, at }
  })
  const s: Session = {
    id: uid('practice:'),
    kind: 'practice',
    start: new Date(start).toISOString(),
    end: new Date(t).toISOString(),
    setId: set.id,
    plays,
    snapshots: Object.fromEntries(set.items.map((i) => [i.trackId, { artist: i.artist, title: i.title, camelot: i.camelot, bpm: i.bpm }])),
  }
  await db.sessions.put(s)
  return s
}

export function PracticeTab() {
  const app = useApp()
  const toast = useToast()
  const sessions = useLiveQuery(() => db.sessions.orderBy('start').reverse().toArray(), [], [] as Session[])
  const sets = useLiveQuery(() => db.sets.orderBy('updatedAt').reverse().toArray(), [], [] as SavedSet[])
  const ratings = useLiveQuery(() => db.ratings.toArray(), [], [] as Rating[])
  const [open, setOpen] = useState<Session | null>(null)
  const [pick, setPick] = useState<'practice' | 'export' | null>(null)
  const [exportId, setExportId] = useState<string | null>(null)
  const counts = { fire: ratings.filter((r) => r.rating === 1).length, ok: ratings.filter((r) => r.rating === 0).length, bad: ratings.filter((r) => r.rating === -1).length }

  return (
    <section aria-labelledby="h-practice" className="flex flex-col gap-5">
      <h1 id="h-practice" className="font-title text-[28px] leading-none text-paper">{S.titles.practice}</h1>

      <div className="grid grid-cols-2 gap-2">
        <PianoKey onClick={() => setPick('practice')} disabled={!sets.length} data-testid="log-practice">
          ✏️ Log practice
        </PianoKey>
        <PianoKey onClick={() => setPick('export')} disabled={!sets.length} data-testid="practice-export">
          ⏏ Export a set
        </PianoKey>
      </div>

      <section className="flex flex-col gap-2" aria-label="Your ratings">
        <SectionLabel>Your transition ratings</SectionLabel>
        <p className="font-mono text-[15px] text-paper" data-testid="rating-counts">
          🔥 {counts.fire} · 👌 {counts.ok} · 👎 {counts.bad}
        </p>
        <p className="text-[13px] text-paper-dim">🔥 pairs score +8 in Next and in generated sets, 👎 pairs −15. Similar key moves learn a little too.</p>
      </section>

      <section className="flex flex-col gap-2" aria-label="Sessions">
        <SectionLabel>Sessions · {sessions.length}</SectionLabel>
        {sessions.length ? (
          <ul className="dashed-rows-dark rounded-2xl bg-walnut-2/50" data-testid="sessions">
            {sessions.map((s) => {
              const mins = s.end ? Math.round((Date.parse(s.end) - Date.parse(s.start)) / 60000) : null
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => setOpen(s)} className="piano-key flex min-h-16 w-full items-center gap-3 px-3 text-left" data-testid="session-row">
                    <span className="text-[22px]" aria-hidden>
                      {s.kind === 'live' ? '▶️' : '✏️'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-paper">{new Date(s.start).toLocaleDateString()} · {s.kind === 'live' ? 'Live' : 'Practice'}</span>
                      <span className="block font-mono text-[12px] text-paper-dim">
                        {s.plays.length} tracks{mins != null ? ` · ${mins} min` : s.end ? '' : ' · open'}
                      </span>
                    </span>
                    <span className="font-mono text-[12px] text-mustard">rate ›</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            title="No sessions yet"
            hint="Live sessions are logged automatically. You can also log practice from a saved set."
            action={
              <PianoKey onClick={() => app.go('live')} tone="mustard">
                Go live
              </PianoKey>
            }
          />
        )}
      </section>

      {open ? <SessionSheet session={open} onClose={() => setOpen(null)} /> : null}
      {exportId ? <ExportSheet setId={exportId} onClose={() => setExportId(null)} /> : null}
      <Sheet open={pick !== null} onClose={() => setPick(null)} title={pick === 'export' ? 'Export which set?' : 'Practice which set?'} testId="set-pick">
        <ul className="dashed-rows-dark">
          {sets.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="piano-key flex min-h-14 w-full items-center gap-2 px-2 text-left"
                onClick={async () => {
                  const mode = pick
                  setPick(null)
                  if (mode === 'export') setExportId(s.id)
                  else {
                    const session = await logPractice(s, (await db.settings.get('overlapSec'))?.value as number ?? 60)
                    toast('Practice logged · rate the transitions')
                    setOpen(session)
                  }
                }}
              >
                <span className="font-marker text-[20px] text-paper">{s.name}</span>
                <span className="ml-auto font-mono text-[12px] text-paper-dim">{s.trackIds.length} tr</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  )
}
