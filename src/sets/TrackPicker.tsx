import { useMemo, useState } from 'react'
import { CheckSquareIcon, MagnifyingGlassIcon, SquareIcon } from '@phosphor-icons/react'
import { useLibrary } from '../data/LibraryProvider'
import { searchTracks } from '../data/search'
import { Sheet } from '../ui/Sheet'
import { PianoKey } from '../ui/kit'
import { TrackRow } from '../ui/TrackRow'
import { VirtualList } from '../ui/VirtualList'

/** Search + multi-select over the library. */
export function TrackPicker({
  open,
  onClose,
  selected,
  onDone,
  single = false,
  title = 'Pick tracks',
}: {
  open: boolean
  onClose: () => void
  selected: string[]
  onDone: (ids: string[]) => void
  single?: boolean
  title?: string
}) {
  const lib = useLibrary()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(() => new Set(selected))
  const results = useMemo(() => searchTracks(lib.tracks, q, 5000), [lib.tracks, q])

  const toggle = (id: string) => {
    if (single) {
      onDone([id])
      onClose()
      return
    }
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} full testId="track-picker">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <label className="flex min-h-12 items-center gap-2 rounded-xl bg-walnut-2 px-3">
          <MagnifyingGlassIcon size={20} className="text-paper-dim" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Artist or title"
            aria-label="Search the library"
            className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-paper placeholder:text-paper-dim/70 outline-none"
            data-testid="picker-search"
          />
          <span className="font-mono text-[12px] text-paper-dim">{results.length}</span>
        </label>
        <VirtualList
          items={results}
          getKey={(t) => t.id}
          className="h-[58dvh] rounded-xl bg-walnut-2/40"
          testId="picker-list"
          render={(t) => (
            <TrackRow
              track={t}
              onClick={() => toggle(t.id)}
              selected={sel.has(t.id)}
              testId={`pick-${t.id}`}
              right={
                single ? null : sel.has(t.id) ? (
                  <CheckSquareIcon size={24} weight="fill" className="text-mustard" aria-hidden />
                ) : (
                  <SquareIcon size={24} className="text-paper-dim" aria-hidden />
                )
              }
            />
          )}
        />
        {!single ? (
          <PianoKey tone="mustard" size="lg" onClick={() => (onDone([...sel]), onClose())} data-testid="picker-done">
            Done · {sel.size} picked
          </PianoKey>
        ) : null}
      </div>
    </Sheet>
  )
}
