import { useMemo } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { S } from '../strings'
import { useApp } from '../state/app'
import { useLibrary } from '../data/LibraryProvider'
import { EmptyState, KeyChip } from '../ui/kit'
import { TrackRow } from '../ui/TrackRow'

export function LibraryTab() {
  const app = useApp()
  const lib = useLibrary()
  const key = app.libraryKeyFilter
  const list = useMemo(() => (key ? lib.tracks.filter((t) => t.camelot === key) : lib.tracks), [lib.tracks, key])
  return (
    <section aria-labelledby="h-library" className="flex flex-col gap-4">
      <h1 id="h-library" className="font-title text-[28px] leading-none text-paper">{S.titles.library}</h1>
      {key ? (
        <div className="flex items-center gap-2" data-testid="library-key-filter">
          <KeyChip camelot={key} showName />
          <span className="font-mono text-[14px] text-paper-dim">{list.length} tracks</span>
          <button type="button" onClick={() => app.setLibraryKeyFilter(null)} aria-label="Clear key filter" className="piano-key ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-walnut-2">
            <XIcon size={20} />
          </button>
        </div>
      ) : null}
      {list.length ? (
        <div className="dashed-rows-dark rounded-2xl bg-walnut-2/50">
          {list.map((t) => (
            <TrackRow key={t.id} track={t} />
          ))}
        </div>
      ) : (
        <EmptyState title={S.emptyLibrary} hint={S.emptyLibraryHint} />
      )}
    </section>
  )
}
