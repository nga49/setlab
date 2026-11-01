import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { SavedSet } from '../db/types'
import { useLibrary } from '../data/LibraryProvider'
import { ALL_KEYS, splitCamelot } from '../engine/camelot'
import { useApp } from '../state/app'
import { useStore } from '../state/store'
import { organizer } from '../sets/draft'
import { angleOf, C, R_INNER, R_MID, R_OUTER, polar, sectorPath, SIZE } from '../wheel/geometry'
import { KeyChip, SectionLabel } from '../ui/kit'
import { findGaps, type Zone } from './gaps'
import { useSettings } from '../db/settings'
import { missingDraft } from '../missing/draft'

/** Sequential single-hue ramp on walnut (magnitude only): mustard at increasing strength. */
function ramp(v: number, max: number): string {
  const t = max ? v / max : 0
  return `rgb(232 163 61 / ${0.08 + t * 0.92})`
}

function Bars({ data, unit, testId }: { data: { label: string; value: number }[]; unit: string; testId?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="flex flex-col gap-1.5" data-testid={testId}>
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-2">
          <span className="truncate text-[13px] text-paper">{d.label}</span>
          <span className="h-3.5" aria-hidden>
            <span className="block h-full rounded-r-[4px] bg-mustard" style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} />
          </span>
          <span className="text-right font-mono text-[13px] text-paper-dim" aria-label={`${d.value} ${unit}`}>
            {d.value}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function Insights() {
  const lib = useLibrary()
  const app = useApp()
  const settings = useSettings()
  const org = useStore(organizer)
  const sets = useLiveQuery(() => db.sets.toArray(), [], [] as SavedSet[])
  const [tip, setTip] = useState<string | null>(null)
  const owned = lib.owned

  const keyCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of owned) if (t.camelot) m.set(t.camelot, (m.get(t.camelot) ?? 0) + 1)
    return m
  }, [owned])
  const maxKey = Math.max(1, ...keyCounts.values())

  const bpmBins = useMemo(() => {
    const bins = Array.from({ length: 24 }, (_, i) => ({ from: 60 + i * 5, n: 0 }))
    for (const t of owned) if (t.bpm) bins[Math.min(23, Math.max(0, Math.floor((t.bpm - 60) / 5)))]!.n++
    return bins
  }, [owned])
  const maxBin = Math.max(1, ...bpmBins.map((b) => b.n))

  const genres = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of owned) m.set(t.genre ?? 'Unknown', (m.get(t.genre ?? 'Unknown') ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, value]) => ({ label, value }))
  }, [owned])

  const eras = useMemo(() => {
    const m = new Map<number, number>()
    for (const t of owned) if (t.year) m.set(Math.floor(t.year / 5) * 5, (m.get(Math.floor(t.year / 5) * 5) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([y, value]) => ({ label: `${y} to ${y + 4}`, value }))
  }, [owned])

  const gaps: Zone[] = useMemo(() => {
    const setTracks = [
      ...sets.flatMap((s) => s.items.map((i) => ({ camelot: i.camelot, bpm: i.bpm, genre: lib.byId.get(i.trackId)?.genre ?? null }))),
      ...(org.results ?? []).flatMap((r) => r.tracks),
    ]
    return findGaps(owned, setTracks)
  }, [sets, org.results, owned, lib.byId])

  const findTracks = (z: Zone) => {
    missingDraft.set({ mode: 'gap', gap: { camelot: z.camelot, bpmFrom: z.bpmFrom, bpmTo: z.bpmTo, genre: z.genre } })
    app.go('library', 'missing')
  }

  if (!owned.length) return <p className="text-[14px] text-paper-dim">No tracks to analyse yet.</p>

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2" aria-label="Camelot heatmap">
        <SectionLabel>Camelot heatmap · tracks per key</SectionLabel>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-[360px]" role="img" aria-label="Tracks per key on the Camelot wheel" data-testid="heatmap">
          <circle cx={C} cy={C} r={199} fill="#1E140E" />
          {ALL_KEYS.map((k) => {
            const [n, l] = splitCamelot(k)
            const outer = l === 'B'
            const r0 = outer ? R_MID + 2 : R_INNER
            const r1 = outer ? R_OUTER : R_MID - 2
            const [x, y] = polar((r0 + r1) / 2, angleOf(n))
            const v = keyCounts.get(k) ?? 0
            return (
              <g key={k} onClick={() => setTip(`${k}: ${v} tracks`)} style={{ cursor: 'pointer' }}>
                <path d={sectorPath(angleOf(n), r0, r1)} fill={ramp(v, maxKey)} stroke="#2B1D14" strokeWidth={2} />
                <text x={x} y={y - 3} textAnchor="middle" fontFamily="Space Mono" fontWeight={700} fontSize={13} fill={v / maxKey > 0.55 ? '#2B1D14' : '#F2E3C6'}>
                  {k}
                </text>
                <text x={x} y={y + 13} textAnchor="middle" fontFamily="Space Mono" fontSize={12} fill={v / maxKey > 0.55 ? '#2B1D14' : '#CDBB9C'}>
                  {v}
                </text>
              </g>
            )
          })}
        </svg>
        {tip ? <p className="text-center font-mono text-[13px] text-paper" role="status">{tip}</p> : null}
      </section>

      <section className="flex flex-col gap-2" aria-label="BPM histogram">
        <SectionLabel>BPM · tracks per 5 BPM</SectionLabel>
        <div className="flex h-32 items-end gap-[2px]" data-testid="bpm-histogram">
          {bpmBins.map((b) => (
            <button
              key={b.from}
              type="button"
              onClick={() => setTip(`${b.from} to ${b.from + 4} BPM: ${b.n} tracks`)}
              className="flex h-full flex-1 items-end"
              aria-label={`${b.from} to ${b.from + 4} BPM: ${b.n} tracks`}
            >
              <span className="block w-full rounded-t-[4px] bg-mustard" style={{ height: `${(b.n / maxBin) * 100}%`, minHeight: b.n ? 3 : 0 }} />
            </button>
          ))}
        </div>
        <div className="flex justify-between font-mono text-[11px] text-paper-dim" aria-hidden>
          <span>60</span>
          <span>90</span>
          <span>120</span>
          <span>150</span>
          <span>180</span>
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-label="Genres">
        <SectionLabel>Genres</SectionLabel>
        <Bars data={genres} unit="tracks" testId="genre-bars" />
      </section>

      {eras.length ? (
        <section className="flex flex-col gap-2" aria-label="Eras">
          <SectionLabel>Eras · by release year</SectionLabel>
          <Bars data={eras} unit="tracks" />
        </section>
      ) : null}

      <section className="flex flex-col gap-2" aria-label="Gap finder" data-testid="gap-finder">
        <SectionLabel>Gap finder · weak spots</SectionLabel>
        <p className="text-[13px] text-paper-dim">{sets.length || org.results ? 'Ranked by how often these zones appear in your sets.' : 'Build or save sets to rank gaps by what you play. For now: thin spots next to busy ones.'}</p>
        <ul className="dashed-rows-dark rounded-xl bg-walnut-2/50">
          {gaps.map((z) => (
            <li key={`${z.camelot}-${z.bpmFrom}`} className="flex min-h-14 items-center gap-2 px-2">
              <KeyChip camelot={z.camelot} size="sm" />
              <span className="min-w-0 flex-1 text-[14px] text-paper">{z.label}</span>
              <button
                type="button"
                onClick={() => findTracks(z)}
                className="piano-key min-h-12 rounded-lg border border-teal-light/50 px-2.5 font-mono text-[12px] font-bold text-teal-light"
                aria-label={`Find tracks for ${z.label}`}
              >
                🟣 Find{settings.aiKey ? '' : ' *'}
              </button>
            </li>
          ))}
        </ul>
        {!settings.aiKey ? <p className="font-mono text-[11px] text-paper-dim">* needs a Claude API key (Settings)</p> : null}
      </section>
    </div>
  )
}
