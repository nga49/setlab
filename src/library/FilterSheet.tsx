import { useMemo } from 'react'
import { useLibrary } from '../data/LibraryProvider'
import { useStore } from '../state/store'
import { Sheet } from '../ui/Sheet'
import { RangeSlider } from '../ui/Slider'
import { Chip, PianoKey, SectionLabel } from '../ui/kit'
import { DEFAULT_FILTERS, libraryFilters, type SourceFilter } from './filters'
import { BUILTIN_TAGS } from './tags'

export function FilterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lib = useLibrary()
  const f = useStore(libraryFilters)
  const genres = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of lib.tracks) if (t.genre) m.set(t.genre, (m.get(t.genre) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [lib.tracks])
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const sources: { id: SourceFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'rekordbox', label: '🟢 rekordbox' },
    { id: 'wishlist', label: '✏️ wishlist' },
    { id: 'estimated', label: '🟡 estimated' },
    { id: 'demo', label: '🧪 demo' },
  ]
  return (
    <Sheet open={open} onClose={onClose} title="Filters" full testId="filter-sheet">
      <div className="flex flex-col gap-5">
        <RangeSlider label="BPM" value={f.bpm} min={60} max={180} onChange={(bpm) => libraryFilters.set({ bpm })} />
        <RangeSlider label="Energy" value={f.energy} min={1} max={10} onChange={(energy) => libraryFilters.set({ energy })} />
        <section className="flex flex-col gap-2">
          <SectionLabel>Source</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <Chip key={s.id} active={f.source === s.id} onClick={() => libraryFilters.set({ source: s.id })}>
                {s.label}
              </Chip>
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-2">
          <SectionLabel>Tags</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {BUILTIN_TAGS.map((t) => (
              <Chip key={t.id} active={f.tags.includes(t.id)} onClick={() => libraryFilters.set({ tags: toggle(f.tags, t.id) })}>
                {t.emoji} {t.label}
              </Chip>
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-2">
          <SectionLabel>Genre</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {genres.map(([g, n]) => (
              <Chip key={g} active={f.genres.includes(g)} onClick={() => libraryFilters.set({ genres: toggle(f.genres, g) })}>
                {g} <span className="font-mono text-[12px] opacity-70">{n}</span>
              </Chip>
            ))}
          </div>
        </section>
        <div className="grid grid-cols-2 gap-2">
          <PianoKey tone="walnut" onClick={() => libraryFilters.set({ ...DEFAULT_FILTERS, q: f.q, sort: f.sort })}>
            Clear
          </PianoKey>
          <PianoKey tone="mustard" onClick={onClose}>
            Show tracks
          </PianoKey>
        </div>
      </div>
    </Sheet>
  )
}
