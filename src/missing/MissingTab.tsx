import { useMemo, useState } from 'react'
import { CheckIcon, TrashIcon } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { MissingItem } from '../db/types'
import { useSettings } from '../db/settings'
import { useLibrary } from '../data/LibraryProvider'
import { BEATPORT_GENRES, GENRE_BPM } from '../engine/genres'
import { DEFAULT_PRESETS, type PartyPreset, presetById } from '../engine/parties'
import { classicsRequest, discover, gapRequest, ownedForPrompt, partyRequest, trendingRequest, type DiscoveryRequest } from '../ai/features'
import { useAiCall } from '../ai/useAiCall'
import { useStore } from '../state/store'
import { S } from '../strings'
import { CopyButtons } from '../ui/CopyButtons'
import { Chip, cx, EmptyState, KeyChip, PianoKey, SectionLabel } from '../ui/kit'
import { RangeSlider, Slider } from '../ui/Slider'
import { useToast } from '../ui/Toast'
import { missingDraft, type FinderMode } from './draft'
import { removeMissing, saveDiscovered, setMissingStatus } from './store'

const MODES: { id: FinderMode; label: string }[] = [
  { id: 'classics', label: '🕰️ Classics' },
  { id: 'party', label: '🎉 Party' },
  { id: 'trending', label: '📈 Trending' },
  { id: 'gap', label: '🧩 Fill a gap' },
]
// 🎧 Spotify is hidden: see DECISIONS.md (Development Mode restrictions, endpoints not verifiable).

const NOW = new Date().getFullYear()
const STATUS = { missing: '🔴 missing', pending: '⏳ pending', owned: '🟢 owned' } as const

function Row({ m, fit }: { m: MissingItem; fit: number | null }) {
  const toast = useToast()
  return (
    <li className="flex flex-col gap-2 py-3" data-testid="missing-row">
      <div className="flex items-start gap-2">
        <KeyChip camelot={m.estCamelot} size="sm" estimated />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-paper">
            {m.artist} · {m.title}
            {m.remix ? ` (${m.remix})` : ''}
          </p>
          <p className="font-mono text-[12px] text-paper-dim">
            {m.year ?? '?'} · 🟡 {m.estBpm ?? '?'} BPM · {m.genre ?? '?'}
            {fit != null ? ` · fits ${fit} of your tracks` : ''}
          </p>
          {m.why ? <p className="text-[13px] text-paper-dim">{m.why}</p> : null}
        </div>
        <span className={cx('shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold', m.status === 'owned' ? 'bg-olive/40 text-paper' : m.status === 'pending' ? 'bg-mustard/30 text-paper' : 'bg-rust/40 text-paper')}>
          {STATUS[m.status]}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {m.status !== 'owned' ? <CopyButtons track={m} /> : null}
        {m.status === 'missing' ? (
          <button
            type="button"
            onClick={async () => {
              await setMissingStatus(m.id, 'pending')
              toast('Pending until your next sync')
            }}
            className="piano-key flex min-h-12 items-center gap-1 rounded-lg bg-[#3E6B41] px-3 font-mono text-[13px] font-bold text-paper"
            data-testid="got-it"
          >
            <CheckIcon size={16} weight="bold" aria-hidden /> Got it
          </button>
        ) : null}
        <button type="button" onClick={() => removeMissing(m.id)} aria-label={`Remove ${m.title}`} className="flex h-12 w-12 items-center justify-center text-paper-dim">
          <TrashIcon size={18} />
        </button>
      </div>
    </li>
  )
}

/** Missing tracks finder: what Nico should add to his collection (docs/PRODUCT.md §5). */
export function MissingTab() {
  const lib = useLibrary()
  const s = useSettings()
  const d = useStore(missingDraft)
  const { busy, run } = useAiCall()
  const [last, setLast] = useState<{ ids: string[]; note: string | null } | null>(null)
  const items = useLiveQuery(() => db.missing.orderBy('savedAt').reverse().toArray(), [], [] as MissingItem[])
  const presets = (s.partyPresets as PartyPreset[] | null) ?? DEFAULT_PRESETS
  const graph = useMemo(() => (lib.owned.length ? lib.graph() : null), [lib])
  const fitOf = (m: MissingItem) =>
    graph && m.estBpm && m.estCamelot
      ? graph.fitScore({ id: m.id, artist: m.artist, title: m.title, remix: m.remix, genre: m.genre, bpm: m.estBpm, camelot: m.estCamelot, energy: m.energy ?? 6, lengthSec: null, year: m.year, tags: [] })
      : null

  const search = async () => {
    let req: DiscoveryRequest
    if (d.mode === 'classics') req = classicsRequest(d.eraFrom, d.eraTo, d.genreText, ownedForPrompt(lib.owned, { years: [d.eraFrom, d.eraTo] }))
    else if (d.mode === 'party') {
      const p = presetById(d.party, presets)
      req = partyRequest(p, d.crowdAge, NOW, ownedForPrompt(lib.owned, { genres: Object.keys(p.genres) }))
    } else if (d.mode === 'trending') req = trendingRequest(d.trendGenre, d.trendBpm, d.vibe, ownedForPrompt(lib.owned, { genres: [d.trendGenre] }))
    else {
      if (!d.gap) return
      req = gapRequest(d.gap, ownedForPrompt(lib.owned, { genres: d.gap.genre ? [d.gap.genre] : undefined }))
    }
    const r = await run((o) => discover(req, o))
    if (!r) return
    const saved = await saveDiscovered(r.tracks, d.mode === 'gap' ? 'gap' : d.mode, req.query, lib.tracks)
    setLast({ ids: saved.map((m) => m.id), note: r.trendNote })
  }

  const filtered = items.filter((m) => d.listFilter === 'all' || m.status === d.listFilter)
  const lastItems = last ? items.filter((m) => last.ids.includes(m.id)) : []

  return (
    <div className="flex flex-col gap-5">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Search mode">
        {MODES.map((m) => (
          <Chip key={m.id} active={d.mode === m.id} onClick={() => missingDraft.set({ mode: m.id })}>
            {m.label}
          </Chip>
        ))}
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-walnut-2/60 p-3" aria-label="Search">
        {d.mode === 'classics' ? (
          <>
            <RangeSlider label="Era" value={[d.eraFrom, d.eraTo]} min={1970} max={NOW} onChange={([a, b]) => missingDraft.set({ eraFrom: a, eraTo: b })} />
            <label className="flex flex-col gap-1">
              <span className="text-[14px] text-paper-dim">Genre or style</span>
              <input value={d.genreText} onChange={(e) => missingDraft.set({ genreText: e.target.value })} placeholder="party anthems, R&B, house" className="h-12 rounded-lg bg-walnut px-3 text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard" />
            </label>
          </>
        ) : null}
        {d.mode === 'party' ? (
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Chip key={p.id} active={d.party === p.id} onClick={() => missingDraft.set({ party: p.id })}>
                {p.emoji} {p.label}
              </Chip>
            ))}
          </div>
        ) : null}
        {d.mode === 'trending' ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-[14px] text-paper-dim">Beatport genre</span>
              <select
                value={d.trendGenre}
                onChange={(e) => missingDraft.set({ trendGenre: e.target.value, trendBpm: GENRE_BPM[e.target.value] ?? d.trendBpm })}
                className="h-12 rounded-lg bg-walnut px-3 text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard"
              >
                {BEATPORT_GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <RangeSlider label="BPM" value={d.trendBpm} min={60} max={180} onChange={(v) => missingDraft.set({ trendBpm: v })} />
            <label className="flex flex-col gap-1">
              <span className="text-[14px] text-paper-dim">Vibe (optional)</span>
              <input value={d.vibe} onChange={(e) => missingDraft.set({ vibe: e.target.value })} placeholder="dark, vocal, sunset…" className="h-12 rounded-lg bg-walnut px-3 text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard" />
            </label>
          </>
        ) : null}
        {d.mode === 'gap' ? (
          d.gap ? (
            <div className="flex items-center gap-2">
              <KeyChip camelot={d.gap.camelot} />
              <span className="font-mono text-[14px] text-paper">
                {d.gap.bpmFrom} to {d.gap.bpmTo} BPM{d.gap.genre ? ` · ${d.gap.genre}` : ''}
              </span>
            </div>
          ) : (
            <p className="text-[14px] text-paper-dim">Open Library › Insights › Gap finder and tap 🟣 Find on a weak spot.</p>
          )
        ) : null}
        {d.mode === 'party' ? <Slider label="Crowd age" value={d.crowdAge} min={18} max={70} onChange={(v) => missingDraft.set({ crowdAge: v })} /> : null}
        {s.aiKey ? (
          <PianoKey tone="rust" size="lg" onClick={search} disabled={busy || (d.mode === 'gap' && !d.gap)} data-testid="missing-search">
            {busy ? 'Searching the web…' : '🟣 Find tracks'}
          </PianoKey>
        ) : (
          <p className="rounded-lg border border-dashed border-teal-light/50 p-3 text-[14px] text-teal-light">🟣 {S.noKeyHint}</p>
        )}
      </section>

      {last ? (
        <section className="flex flex-col gap-1" aria-label="Results">
          <SectionLabel>Results · {lastItems.length}</SectionLabel>
          {last.note ? <p className="text-[13px] text-paper-dim">{last.note}</p> : null}
          <ul className="dashed-rows-dark">
            {lastItems.map((m) => (
              <Row key={m.id} m={m} fit={fitOf(m)} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-2" aria-label="Shopping list" data-testid="shopping-list">
        <SectionLabel>🛒 Shopping list · {items.length}</SectionLabel>
        <div className="flex gap-2">
          {(['all', 'missing', 'pending', 'owned'] as const).map((f) => (
            <Chip key={f} active={d.listFilter === f} onClick={() => missingDraft.set({ listFilter: f })}>
              {f === 'all' ? 'All' : STATUS[f]}
            </Chip>
          ))}
        </div>
        {filtered.length ? (
          <ul className="dashed-rows-dark">
            {filtered.map((m) => (
              <Row key={m.id} m={m} fit={null} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing here yet" hint={s.aiKey ? 'Run a search above. Results land here.' : 'Add a Claude API key in Settings to find missing tracks.'} />
        )}
      </section>
    </div>
  )
}
