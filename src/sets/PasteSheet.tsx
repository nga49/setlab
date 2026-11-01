import { useMemo, useState } from 'react'
import { db, nowIso, uid } from '../db/db'
import type { StoredTrack } from '../db/types'
import { useLibrary } from '../data/LibraryProvider'
import { Matcher, parseTrackList, type TrackRef } from '../engine/match'
import { parseKey } from '../engine/camelot'
import { Sheet } from '../ui/Sheet'
import { PianoKey, SectionLabel } from '../ui/kit'
import { TrackRow } from '../ui/TrackRow'
import { EstimateButton } from '../ai/EstimateButton'

interface Row {
  ref: TrackRef
  matchId: string | null
  confidence: number
}

/**
 * Paste a text list: lines are matched to the library (fuzzy). Unmatched lines become
 * "unknown" tracks that can be estimated by AI or filled in by hand (saved as wishlist).
 */
export function PasteSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (ids: string[]) => void }) {
  const lib = useLibrary()
  const [text, setText] = useState('')
  const [manual, setManual] = useState<Record<number, { bpm: string; key: string }>>({})
  const matcher = useMemo(() => new Matcher(lib.tracks), [lib.tracks])
  const rows: Row[] = useMemo(
    () =>
      parseTrackList(text).map((ref) => {
        const hit = matcher.best(ref)
        return { ref, matchId: hit?.item.id ?? null, confidence: hit?.confidence ?? 0 }
      }),
    [text, matcher],
  )
  const unknown = rows.filter((r) => !r.matchId)

  const finish = async () => {
    const ids: string[] = []
    const created: StoredTrack[] = []
    rows.forEach((r, i) => {
      if (r.matchId) {
        ids.push(r.matchId)
        return
      }
      const m = manual[i]
      const t: StoredTrack = {
        id: uid('local:'),
        artist: r.ref.artist || 'Unknown artist',
        title: r.ref.title,
        remix: r.ref.remix ?? null,
        genre: null,
        bpm: m?.bpm ? Number(m.bpm) || null : null,
        keyRaw: m?.key || null,
        camelot: parseKey(m?.key),
        lengthSec: null,
        year: null,
        source: 'local',
        status: 'wishlist',
        dateAdded: nowIso().slice(0, 10),
      }
      created.push(t)
      ids.push(t.id)
    })
    if (created.length) await db.tracks.bulkPut(created)
    onDone(ids)
    setText('')
    setManual({})
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Paste a list" full testId="paste-sheet">
      <div className="flex flex-col gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder={'One track per line\nArtist - Title (Remix)'}
          aria-label="Track list"
          className="w-full rounded-xl bg-walnut-2 p-3 font-mono text-[15px] text-paper placeholder:text-paper-dim/70 outline-none focus-visible:ring-2 focus-visible:ring-mustard"
          data-testid="paste-input"
        />
        {rows.length ? (
          <>
            <SectionLabel>
              {rows.length - unknown.length} matched · {unknown.length} unknown
            </SectionLabel>
            <div className="dashed-rows-dark rounded-xl bg-walnut-2/50">
              {rows.map((r, i) => {
                const t = r.matchId ? lib.byId.get(r.matchId) : null
                if (t) return <TrackRow key={i} track={t} right={<span className="font-mono text-[12px] text-[#9BCB9E]">✓ {Math.round(r.confidence * 100)}%</span>} />
                return (
                  <div key={i} className="flex flex-col gap-2 px-2 py-2">
                    <p className="text-[15px] font-bold text-paper">
                      <span className="mr-2 rounded bg-rust px-1.5 py-0.5 font-mono text-[11px] text-paper">UNKNOWN</span>
                      {r.ref.artist ? `${r.ref.artist} · ` : ''}
                      {r.ref.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        inputMode="decimal"
                        placeholder="BPM"
                        aria-label={`BPM for ${r.ref.title}`}
                        value={manual[i]?.bpm ?? ''}
                        onChange={(e) => setManual((m) => ({ ...m, [i]: { key: m[i]?.key ?? '', bpm: e.target.value } }))}
                        className="h-12 w-24 rounded-lg bg-walnut px-3 font-mono text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard"
                      />
                      <input
                        placeholder="Key (8A / Am)"
                        aria-label={`Key for ${r.ref.title}`}
                        value={manual[i]?.key ?? ''}
                        onChange={(e) => setManual((m) => ({ ...m, [i]: { bpm: m[i]?.bpm ?? '', key: e.target.value } }))}
                        className="h-12 w-36 rounded-lg bg-walnut px-3 font-mono text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard"
                      />
                      <EstimateButton
                        track={r.ref}
                        onEstimate={(e) =>
                          setManual((m) => ({ ...m, [i]: { bpm: e.bpm ? String(e.bpm) : (m[i]?.bpm ?? ''), key: e.camelot ?? m[i]?.key ?? '' } }))
                        }
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {unknown.length > 1 && unknown.length <= 10 ? (
              <EstimateButton
                batch={unknown.map((u) => u.ref)}
                onBatch={(list) => {
                  const next = { ...manual }
                  let k = 0
                  rows.forEach((r, i) => {
                    if (r.matchId) return
                    const e = list[k++]
                    if (e) next[i] = { bpm: e.bpm ? String(e.bpm) : '', key: e.camelot ?? '' }
                  })
                  setManual(next)
                }}
              />
            ) : null}
            <PianoKey tone="mustard" size="lg" onClick={finish} data-testid="paste-done">
              Use these {rows.length} tracks
            </PianoKey>
          </>
        ) : null}
      </div>
    </Sheet>
  )
}
