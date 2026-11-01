import { useMemo, useState } from 'react'
import { CopySimpleIcon, MagnifyingGlassIcon, TrashIcon } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { SavedSet } from '../db/types'
import { normalizeText } from '../engine/match'
import { cx, EmptyState, formatDuration } from '../ui/kit'
import { useToast } from '../ui/Toast'
import { deleteSet, duplicateSet } from './actions'
import { editor, MODE_LABEL } from './draft'

const SHELLS = ['#1E3D3A', '#3A281C', '#5E2A1C', '#2F3A4A', '#4A3A1C']

export function openSet(s: SavedSet) {
  editor.set({
    open: true,
    setId: s.id,
    name: s.name,
    mode: s.mode,
    arc: s.arc,
    trackIds: s.trackIds,
    locks: s.locks,
    pinFirst: s.pins?.first ?? null,
    pinLast: s.pins?.last ?? null,
    notes: s.notes ?? '',
    tags: s.tags ?? [],
    kind: s.kind ?? 'organizer',
    createdAt: s.createdAt,
  })
}

/** Tape rack: a shelf of cassettes, newest first, each with a handwritten label. */
export function SavedSets() {
  const sets = useLiveQuery(() => db.sets.orderBy('updatedAt').reverse().toArray(), [], [] as SavedSet[])
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)
  const toast = useToast()
  const list = useMemo(() => {
    const n = normalizeText(q)
    if (!n) return sets
    return sets.filter((s) => normalizeText(`${s.name} ${(s.tags ?? []).join(' ')} ${s.notes ?? ''}`).includes(n))
  }, [sets, q])

  if (!sets.length)
    return <EmptyState icon={<span className="text-3xl">📼</span>} title="The rack is empty" hint="Build a set in Organizer or Party, then tap Edit & save." />

  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-12 items-center gap-2 rounded-xl bg-walnut-2 px-3">
        <MagnifyingGlassIcon size={20} className="text-paper-dim" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search sets"
          aria-label="Search saved sets"
          className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-paper outline-none placeholder:text-paper-dim/70"
        />
      </label>
      <ul className="flex flex-col gap-3 rounded-2xl bg-[linear-gradient(#3A281C,#2B1D14)] p-3 shadow-[inset_0_2px_6px_rgb(0_0_0/0.5)]" data-testid="tape-rack">
        {list.map((s, i) => (
          <li key={s.id} className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => openSet(s)}
              className="piano-key flex min-h-[100px] min-w-0 flex-1 items-center gap-3 rounded-[10px] p-2 text-left shadow-[0_4px_10px_rgb(0_0_0/0.45)]"
              style={{ background: SHELLS[i % SHELLS.length] }}
              aria-label={`Open ${s.name}`}
              data-testid="cassette"
            >
              <span className="flex h-full flex-col justify-center gap-1" aria-hidden>
                <span className="h-4 w-4 rounded-full border-2 border-aluminium-dark bg-walnut-deep" />
                <span className="h-4 w-4 rounded-full border-2 border-aluminium-dark bg-walnut-deep" />
              </span>
              <span className="paper flex min-w-0 flex-1 flex-col rounded-[6px] px-3 py-1.5">
                <span className="truncate font-marker text-[20px] leading-tight text-ink">{s.name}</span>
                <span className="font-mono text-[11px] leading-snug text-ink-soft">
                  {new Date(s.updatedAt).toLocaleDateString()} · {MODE_LABEL[s.mode].emoji} {MODE_LABEL[s.mode].label} · {s.trackIds.length} tr · {formatDuration(s.durationSec ?? null)}
                  {s.score != null ? ` · ${Math.round(s.score)}` : ''}
                </span>
              </span>
            </button>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                aria-label={`Duplicate ${s.name}`}
                onClick={async () => {
                  await duplicateSet(s.id)
                  toast('Duplicated')
                }}
                className="piano-key flex h-12 w-12 items-center justify-center rounded-lg bg-walnut-2 text-paper"
              >
                <CopySimpleIcon size={18} />
              </button>
              <button
                type="button"
                aria-label={confirm === s.id ? `Tap again to delete ${s.name}` : `Delete ${s.name}`}
                onClick={async () => {
                  if (confirm !== s.id) return setConfirm(s.id)
                  await deleteSet(s.id)
                  setConfirm(null)
                  toast('Deleted')
                }}
                className={cx('piano-key flex h-12 w-12 items-center justify-center rounded-lg', confirm === s.id ? 'bg-rust text-paper' : 'bg-walnut-2 text-paper')}
              >
                <TrashIcon size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
