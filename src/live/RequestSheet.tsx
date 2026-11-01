import { useMemo, useState } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useLibrary } from '../data/LibraryProvider'
import { displayTitle, type LibTrack } from '../data/effective'
import { searchTracks } from '../data/search'
import { parseKey } from '../engine/camelot'
import { heuristicEnergy } from '../engine/energy'
import { LibraryGraph, type PathResult, type Ranked } from '../engine/graph'
import { normalizeGenre } from '../engine/genres'
import { parseTrackLine } from '../engine/match'
import type { EngineTrack } from '../engine/types'
import { EstimateButton } from '../ai/EstimateButton'
import { CopyButtons } from '../ui/CopyButtons'
import { Sheet } from '../ui/Sheet'
import { KeyChip, PianoKey, SectionLabel, TransitionDot } from '../ui/kit'
import { TrackRow } from '../ui/TrackRow'
import { NextList } from './NextList'

interface Target {
  track: EngineTrack
  inLibrary: boolean
  estimated: boolean
}

/** "Someone asked for…": best before, best after and the path from now. */
export function RequestSheet({
  open,
  onClose,
  nowId,
  played,
  onPlay,
}: {
  open: boolean
  onClose: () => void
  nowId: string | null
  played: Set<string>
  onPlay: (t: LibTrack) => void
}) {
  const lib = useLibrary()
  const [q, setQ] = useState('')
  const [target, setTarget] = useState<Target | null>(null)
  const [manual, setManual] = useState({ bpm: '', key: '', genre: '' })
  const results = useMemo(() => (q.trim() ? searchTracks(lib.tracks, q, 8) : []), [lib.tracks, q])

  const pickLibrary = (t: LibTrack) => setTarget({ track: t, inLibrary: t.status === 'active', estimated: false })

  const applyManual = (est?: { bpm: number | null; camelot: string | null; genre: string | null; energy: number | null; year: number | null }) => {
    const ref = parseTrackLine(q) ?? { artist: '', title: q, remix: null }
    const bpm = est?.bpm ?? (Number(manual.bpm) || null)
    const camelot = est?.camelot ?? parseKey(manual.key)
    const genre = normalizeGenre(est?.genre ?? manual.genre ?? null)
    setTarget({
      track: {
        id: 'request:virtual',
        artist: ref.artist || 'Requested',
        title: ref.title,
        remix: ref.remix ?? null,
        genre,
        bpm,
        camelot,
        energy: est?.energy ?? heuristicEnergy({ genre, bpm }),
        lengthSec: null,
        year: est?.year ?? null,
        tags: [],
      },
      inLibrary: false,
      estimated: !!est,
    })
  }

  const blocks = useMemo(() => {
    if (!target) return null
    const exclude = new Set(played)
    const g = target.inLibrary ? lib.graph() : new LibraryGraph([...lib.owned.filter((t) => t.id !== target.track.id), target.track], lib.ctx, lib.overlapSec)
    const before: Ranked[] = g.bestBefore(target.track.id, 3, exclude)
    const after: Ranked[] = g.bestAfter(target.track.id, 3, exclude)
    let path: PathResult | null = null
    if (nowId && nowId !== target.track.id && g.indexOf(nowId) !== undefined) {
      path = g.path(nowId, target.track.id, { exclude: new Set([...exclude].filter((id) => id !== nowId)) })
    }
    return { before, after, path }
  }, [target, lib, played, nowId])

  const reset = () => {
    setTarget(null)
    setQ('')
    setManual({ bpm: '', key: '', genre: '' })
  }
  const playFrom = (t: EngineTrack) => {
    const lt = lib.byId.get(t.id)
    if (lt) {
      onPlay(lt)
      onClose()
    }
  }

  return (
    <Sheet open={open} onClose={() => (reset(), onClose())} title="Request" full testId="request-sheet">
      <div className="flex flex-col gap-4">
        {!target ? (
          <>
            <label className="flex min-h-14 items-center gap-2 rounded-xl bg-walnut-2 px-3">
              <MagnifyingGlassIcon size={22} className="text-paper-dim" aria-hidden />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Someone asked for…"
                aria-label="Requested track"
                className="h-14 min-w-0 flex-1 bg-transparent text-[18px] text-paper outline-none placeholder:text-paper-dim/70"
                data-testid="request-input"
              />
            </label>
            {results.length ? (
              <div className="dashed-rows-dark rounded-xl bg-walnut-2/50" data-testid="request-results">
                {results.map((t) => (
                  <TrackRow key={t.id} track={t} onClick={() => pickLibrary(t)} />
                ))}
              </div>
            ) : null}
            {q.trim().length > 2 ? (
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-walnut-3 p-3">
                <p className="text-[15px] text-paper">{results.length ? 'Not in this list?' : 'Not in your library.'} Enter what you know:</p>
                <div className="flex flex-wrap gap-2">
                  <input inputMode="decimal" placeholder="BPM" aria-label="BPM" value={manual.bpm} onChange={(e) => setManual({ ...manual, bpm: e.target.value })} className="h-12 w-24 rounded-lg bg-walnut px-3 font-mono text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard" data-testid="request-bpm" />
                  <input placeholder="Key (8A / Am)" aria-label="Key" value={manual.key} onChange={(e) => setManual({ ...manual, key: e.target.value })} className="h-12 w-36 rounded-lg bg-walnut px-3 font-mono text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard" data-testid="request-key" />
                  <input placeholder="Genre" aria-label="Genre" value={manual.genre} onChange={(e) => setManual({ ...manual, genre: e.target.value })} className="h-12 w-36 rounded-lg bg-walnut px-3 text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PianoKey onClick={() => applyManual()} disabled={!manual.bpm && !manual.key} data-testid="request-manual">
                    Find spots
                  </PianoKey>
                  <EstimateButton track={parseTrackLine(q) ?? { artist: '', title: q }} onEstimate={(e) => applyManual(e)} />
                </div>
                <CopyButtons track={parseTrackLine(q) ?? { artist: '', title: q }} />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-xl bg-walnut-2 p-3">
              <KeyChip camelot={target.track.camelot} size="lg" estimated={target.estimated} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-bold text-paper">{displayTitle(target.track)}</p>
                <p className="truncate text-[14px] text-paper-dim">
                  {target.track.artist} · {target.track.bpm ? Math.round(target.track.bpm) : '?'} BPM
                  {target.inLibrary ? '' : target.estimated ? ' · 🟡 estimated' : ' · not owned'}
                </p>
              </div>
              <button type="button" className="min-h-12 px-2 font-mono text-[12px] text-paper-dim underline" onClick={reset}>
                change
              </button>
            </div>
            {!target.inLibrary ? <CopyButtons track={target.track} /> : null}

            <section className="flex flex-col gap-2" aria-label="Path from now" data-testid="request-path">
              <SectionLabel>🛤️ Path from now</SectionLabel>
              {!nowId ? (
                <p className="text-[14px] text-paper-dim">Set a Now playing track to see the path.</p>
              ) : blocks?.path ? (
                <>
                  <p className="font-mono text-[14px] font-bold text-mustard">
                    ~{blocks.path.intermediates + 1} tracks · ~{blocks.path.minutes} min
                  </p>
                  <ol className="flex flex-col gap-1">
                    {blocks.path.tracks.map((t, i) => (
                      <li key={`${t.id}-${i}`} className="flex flex-col">
                        {i > 0 ? (
                          <span className="ml-3 flex items-center gap-2 py-0.5">
                            <TransitionDot score={blocks.path!.scores[i - 1]!} size="sm" />
                            <span className="font-mono text-[12px] text-paper-dim">{Math.round(blocks.path!.scores[i - 1]!)}</span>
                          </span>
                        ) : null}
                        <button
                          type="button"
                          disabled={i === 0 || !lib.byId.has(t.id)}
                          onClick={() => playFrom(t)}
                          className="piano-key flex min-h-12 items-center gap-2 rounded-lg bg-walnut-2 px-2 text-left disabled:opacity-80"
                        >
                          <KeyChip camelot={t.camelot} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-paper">
                            {i === 0 ? 'Now · ' : i === blocks.path!.tracks.length - 1 ? 'Request · ' : ''}
                            {displayTitle(t)}
                          </span>
                          <span className="font-mono text-[14px] font-bold text-mustard">{t.bpm ? Math.round(t.bpm) : '?'}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="text-[14px] text-paper-dim">No smooth path within 3 tracks. Try the bridge finder or play it after a breakdown.</p>
              )}
            </section>

            <section className="flex flex-col gap-1" aria-label="Best before">
              <SectionLabel>⬅️ Best before</SectionLabel>
              <NextList items={blocks?.before ?? []} onPick={(r) => playFrom(r.track)} testId="request-before" />
            </section>
            <section className="flex flex-col gap-1" aria-label="Best after">
              <SectionLabel>➡️ Best after</SectionLabel>
              <NextList items={blocks?.after ?? []} onPick={(r) => playFrom(r.track)} testId="request-after" />
            </section>
          </>
        )}
      </div>
    </Sheet>
  )
}
