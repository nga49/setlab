import { useMemo, useState } from 'react'
import { FunnelSimpleIcon, MagnifyingGlassIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import { S } from '../strings'
import { useApp } from '../state/app'
import { useStore } from '../state/store'
import { useLibrary } from '../data/LibraryProvider'
import type { LibTrack } from '../data/effective'
import { runSync } from '../data/sync'
import { Chip, cx, EmptyState, KeyChip } from '../ui/kit'
import { TrackRow } from '../ui/TrackRow'
import { VirtualList } from '../ui/VirtualList'
import { useToast } from '../ui/Toast'
import { SyncCard } from '../library/SyncCard'
import { activeFilterCount, applyFilters, libraryFilters, type SortId } from '../library/filters'
import { FilterSheet } from '../library/FilterSheet'
import { TrackDetail } from '../library/TrackDetail'
import { QuickAdd } from '../library/QuickAdd'
import { Insights } from '../library/Insights'
import { MissingTab } from '../missing/MissingTab'

const SUBS = [
  { id: 'tracks', label: '📚 Tracks' },
  { id: 'insights', label: '📊 Insights' },
  { id: 'missing', label: '🛒 Missing' },
] as const

const SORTS: { id: SortId; label: string }[] = [
  { id: 'artist', label: 'Artist' },
  { id: 'bpm', label: 'BPM' },
  { id: 'key', label: 'Key' },
  { id: 'energy', label: 'Energy' },
  { id: 'added', label: 'Added' },
  { id: 'year', label: 'Year' },
]

export function LibraryTab() {
  const app = useApp()
  const lib = useLibrary()
  const toast = useToast()
  const f = useStore(libraryFilters)
  const [filters, setFilters] = useState(false)
  const [detail, setDetail] = useState<LibTrack | null>(null)
  const [add, setAdd] = useState(false)
  const sub = SUBS.some((s) => s.id === app.sub) ? app.sub : 'tracks'
  const key = app.libraryKeyFilter
  const list = useMemo(() => applyFilters(lib.tracks, f, key), [lib.tracks, f, key])
  const nFilters = activeFilterCount(f)

  return (
    <section aria-labelledby="h-library" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 id="h-library" className="font-title text-[28px] leading-none text-paper">{S.titles.library}</h1>
        <button type="button" onClick={() => setAdd(true)} className="piano-key flex min-h-12 items-center gap-1.5 rounded-full bg-walnut-2 px-4 font-mono text-[13px] font-bold text-paper" data-testid="quick-add-open">
          <PlusIcon size={18} weight="bold" aria-hidden /> Add
        </button>
      </div>
      <SyncCard />
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-walnut-deep/70 p-1.5" role="tablist" aria-label="Library sections">
        {SUBS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={sub === s.id}
            onClick={() => app.go('library', s.id)}
            data-testid={`library-${s.id}`}
            className={cx('piano-key min-h-12 rounded-xl text-[14px] font-bold', sub === s.id ? 'bg-gradient-to-b from-[#F1ECE1] to-[#C9C2B4] text-ink shadow-[inset_0_-4px_0_#8A8274]' : 'text-paper-dim')}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sub === 'tracks' ? (
        <>
          <div className="flex gap-2">
            <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl bg-walnut-2 px-3">
              <MagnifyingGlassIcon size={20} className="text-paper-dim" aria-hidden />
              <input
                value={f.q}
                onChange={(e) => libraryFilters.set({ q: e.target.value })}
                placeholder="Search artist or title"
                aria-label="Search the library"
                className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-paper outline-none placeholder:text-paper-dim/70"
                data-testid="library-search"
              />
            </label>
            <button
              type="button"
              onClick={() => setFilters(true)}
              aria-label={`Filters${nFilters ? `, ${nFilters} active` : ''}`}
              className={cx('piano-key relative flex h-12 w-12 items-center justify-center rounded-xl', nFilters ? 'bg-mustard text-ink' : 'bg-walnut-2 text-paper')}
              data-testid="open-filters"
            >
              <FunnelSimpleIcon size={22} />
              {nFilters ? <span className="absolute -top-1 -right-1 rounded-full bg-rust px-1.5 font-mono text-[11px] text-paper">{nFilters}</span> : null}
            </button>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Sort">
            {SORTS.map((s) => (
              <Chip key={s.id} active={f.sort === s.id} onClick={() => libraryFilters.set({ sort: s.id })}>
                {s.label}
              </Chip>
            ))}
          </div>
          {key ? (
            <div className="flex items-center gap-2" data-testid="library-key-filter">
              <KeyChip camelot={key} showName />
              <button type="button" onClick={() => app.setLibraryKeyFilter(null)} aria-label="Clear key filter" className="piano-key flex h-12 w-12 items-center justify-center rounded-full bg-walnut-2">
                <XIcon size={20} />
              </button>
            </div>
          ) : null}
          <p className="font-mono text-[12px] text-paper-dim" data-testid="library-count">
            {list.length.toLocaleString()} of {lib.tracks.length.toLocaleString()} tracks
          </p>
          {lib.loading ? (
            <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading library">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex h-14 items-center gap-3 rounded-xl bg-walnut-2/50 px-2">
                  <span className="h-6 w-10 animate-pulse rounded bg-walnut-3" />
                  <span className="h-4 flex-1 animate-pulse rounded bg-walnut-3" />
                  <span className="h-4 w-10 animate-pulse rounded bg-walnut-3" />
                </div>
              ))}
            </div>
          ) : list.length ? (
            <VirtualList
              items={list}
              rowHeight={60}
              getKey={(t) => t.id}
              className="h-[calc(100dvh-420px)] min-h-[320px] rounded-2xl bg-walnut-2/40"
              testId="library-list"
              render={(t) => <TrackRow track={t} onClick={() => setDetail(t)} testId={`lib-${t.id}`} />}
              onPullRefresh={async () => toast(await runSync())}
            />
          ) : (
            <EmptyState title={lib.tracks.length ? 'No track matches' : S.emptyLibrary} hint={lib.tracks.length ? 'Clear a filter or the search.' : S.emptyLibraryHint} />
          )}
        </>
      ) : null}
      {sub === 'insights' ? <Insights /> : null}
      {sub === 'missing' ? <MissingTab /> : null}

      <FilterSheet open={filters} onClose={() => setFilters(false)} />
      {detail ? <TrackDetail track={detail} onClose={() => setDetail(null)} /> : null}
      <QuickAdd open={add} onClose={() => setAdd(false)} />
    </section>
  )
}
