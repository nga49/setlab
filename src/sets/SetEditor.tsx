import { useMemo, useRef, useState } from 'react'
import {
  ArrowsLeftRightIcon,
  DotsSixVerticalIcon,
  LinkSimpleIcon,
  ListPlusIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useLibrary } from '../data/LibraryProvider'
import { displayTitle } from '../data/effective'
import { ARCS, ARC_IDS } from '../engine/arcs'
import { analyzeSet } from '../engine/generate'
import type { EngineTrack, Mode } from '../engine/types'
import { useStore } from '../state/store'
import { useApp } from '../state/app'
import { Sheet } from '../ui/Sheet'
import { EnergySpark, ScoreMeter } from '../ui/Meter'
import { Chip, cx, formatBpm, KeyChip, PianoKey, SectionLabel, TapeCounter, TransitionDot } from '../ui/kit'
import { useToast } from '../ui/Toast'
import { bridgeAt, deleteSet, resolveTracks, saveSet, swapAt } from './actions'
import { editor, MODE_LABEL } from './draft'
import { TrackPicker } from './TrackPicker'
import { ExportButton } from '../practice/ExportSheet'

/**
 * Edit a set: drag the grip to reorder, swipe a row left to remove, lock per track.
 * Score and colours update live on every change.
 */
export function SetEditor() {
  const d = useStore(editor)
  const lib = useLibrary()
  const app = useApp()
  const toast = useToast()
  const [picker, setPicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const saved = useLiveQuery(() => (d.setId ? db.sets.get(d.setId) : undefined), [d.setId])
  const tracks = useMemo(() => resolveTracks(d.trackIds, saved?.items, lib), [d.trackIds, saved, lib])
  const locks = new Set(d.locks)
  const analysis = useMemo(
    () => analyzeSet(tracks, { mode: d.mode, arc: d.mode === 'journey' ? d.arc : 'gentle', overlapSec: lib.overlapSec, ctx: lib.ctx }),
    [tracks, d.mode, d.arc, lib.overlapSec, lib.ctx],
  )

  const list = useRef<HTMLOListElement>(null)
  const dragId = useRef<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const swipe = useRef<{ id: string; x0: number; y0: number; dx: number; el: HTMLElement; active: boolean } | null>(null)

  const setIds = (ids: string[]) => editor.set({ trackIds: ids })
  const setTracks = (ts: EngineTrack[] | null) => {
    if (!ts) toast('Nothing in the library fits better', 'error')
    else setIds(ts.map((t) => t.id))
  }

  // --- drag to reorder (grip handle) ---
  const onGripDown = (e: React.PointerEvent, id: string) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragId.current = id
    setDragging(id)
  }
  const onGripMove = (e: React.PointerEvent) => {
    const id = dragId.current
    if (!id || !list.current) return
    const rows = [...list.current.querySelectorAll<HTMLElement>('[data-row]')]
    let over = -1
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!.getBoundingClientRect()
      if (e.clientY >= r.top && e.clientY <= r.bottom) over = i
    }
    const from = d.trackIds.indexOf(id)
    if (over >= 0 && over !== from) {
      const ids = d.trackIds.slice()
      ids.splice(from, 1)
      ids.splice(over, 0, id)
      setIds(ids)
    }
  }
  const onGripUp = () => {
    dragId.current = null
    setDragging(null)
  }

  // --- swipe left to remove ---
  const onRowDown = (e: React.PointerEvent, id: string) => {
    swipe.current = { id, x0: e.clientX, y0: e.clientY, dx: 0, el: e.currentTarget as HTMLElement, active: false }
  }
  const onRowMove = (e: React.PointerEvent) => {
    const s = swipe.current
    if (!s) return
    const dx = e.clientX - s.x0
    const dy = e.clientY - s.y0
    if (!s.active && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) s.active = true
    if (s.active) {
      s.dx = Math.min(0, dx)
      s.el.style.transform = `translateX(${s.dx}px)`
      s.el.style.opacity = String(Math.max(0.3, 1 + s.dx / 220))
    }
  }
  const onRowUp = () => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    if (s.active && s.dx < -110) {
      remove(s.id)
    }
    s.el.style.transform = ''
    s.el.style.opacity = ''
  }

  const remove = (id: string) => editor.set({ trackIds: d.trackIds.filter((x) => x !== id), locks: d.locks.filter((x) => x !== id) })
  const toggleLock = (id: string) =>
    editor.set({ locks: locks.has(id) ? d.locks.filter((x) => x !== id) : [...d.locks, id].slice(-3) })

  const close = () => {
    editor.set({ open: false })
    setConfirmDelete(false)
  }
  const save = async () => {
    await saveSet(d, tracks, analysis.total, analysis.durationSec)
    toast('Saved to the rack')
    close()
    app.go('sets', 'saved')
  }

  return (
    <Sheet open={d.open} onClose={close} title={d.setId ? 'Edit set' : 'New set'} full testId="set-editor">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[13px] text-paper-dim">Name on the tape label</span>
          <input
            value={d.name}
            onChange={(e) => editor.set({ name: e.target.value })}
            placeholder="Saturday warm-up"
            className="paper h-14 rounded-lg px-3 font-marker text-[22px] text-ink outline-none placeholder:text-ink-soft/60 focus-visible:ring-2 focus-visible:ring-mustard"
            data-testid="set-name"
          />
        </label>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-walnut-2 p-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <TapeCounter value={Math.round(analysis.durationSec / 60)} size="sm" label={`${Math.round(analysis.durationSec / 60)} minutes`} />
              <span className="font-mono text-[12px] text-paper-dim">min · {tracks.length} tracks</span>
            </div>
            <div className="flex gap-1.5">
              {(['smooth', 'journey', 'keytour'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => editor.set({ mode: m, arc: m === 'journey' ? (d.arc === 'gentle' ? 'full' : d.arc) : d.arc })}
                  aria-pressed={d.mode === m}
                  aria-label={MODE_LABEL[m].label}
                  className={cx('h-12 w-12 rounded-lg text-[18px]', d.mode === m ? 'bg-mustard' : 'bg-walnut-3/60')}
                >
                  {MODE_LABEL[m].emoji}
                </button>
              ))}
            </div>
          </div>
          <ScoreMeter score={analysis.total} />
        </div>
        {d.mode === 'journey' ? (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {ARC_IDS.map((a) => (
              <Chip key={a} active={d.arc === a} onClick={() => editor.set({ arc: a })}>
                {ARCS[a].label}
              </Chip>
            ))}
          </div>
        ) : null}
        {tracks.length > 1 ? (
          <div className="rounded-lg bg-walnut-2 px-2 py-1">
            <EnergySpark energies={tracks.map((t) => t.energy)} positions={analysis.positions} arc={analysis.arc} />
          </div>
        ) : null}

        <ol ref={list} className="flex flex-col" data-testid="editor-list" onPointerMove={onGripMove} onPointerUp={onGripUp} onPointerCancel={onGripUp}>
          {tracks.map((t, i) => {
            const tr = i > 0 ? analysis.transitions[i - 1] : undefined
            return (
              <li key={t.id}>
                {tr ? (
                  <div className="flex min-h-9 items-center gap-2 pl-10" data-testid="editor-transition" data-color={tr.color}>
                    <TransitionDot score={tr.score} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-paper-dim">
                      {Math.round(tr.score)} · {tr.reasons.slice(0, 2).join(' · ')}
                    </span>
                    {tr.color === 'bad' ? (
                      <>
                        <button type="button" aria-label="Swap" onClick={() => setTracks(swapAt(tracks, i, lib, d.mode, locks))} className="flex h-10 w-10 items-center justify-center rounded-lg bg-rust text-paper">
                          <ArrowsLeftRightIcon size={16} />
                        </button>
                        <button type="button" aria-label="Bridge" onClick={() => setTracks(bridgeAt(tracks, i, lib))} className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal text-paper">
                          <LinkSimpleIcon size={16} />
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <div
                  data-row
                  className={cx('flex min-h-14 touch-pan-y items-center gap-2 rounded-xl bg-walnut-2 pr-1 transition-[background]', dragging === t.id && 'bg-walnut-3 shadow-[0_8px_18px_rgb(0_0_0/0.4)]')}
                  onPointerDown={(e) => onRowDown(e, t.id)}
                  onPointerMove={onRowMove}
                  onPointerUp={onRowUp}
                  onPointerCancel={onRowUp}
                >
                  <span
                    className="flex h-14 w-10 shrink-0 cursor-grab touch-none items-center justify-center text-paper-dim"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      onGripDown(e, t.id)
                    }}
                    aria-label={`Drag to reorder ${t.title}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      const idx = d.trackIds.indexOf(t.id)
                      const to = e.key === 'ArrowUp' ? idx - 1 : e.key === 'ArrowDown' ? idx + 1 : -1
                      if (to < 0 || to >= d.trackIds.length) return
                      e.preventDefault()
                      const ids = d.trackIds.slice()
                      ids.splice(idx, 1)
                      ids.splice(to, 0, t.id)
                      setIds(ids)
                    }}
                    data-testid={`grip-${i}`}
                  >
                    <DotsSixVerticalIcon size={22} weight="bold" />
                  </span>
                  <span className="w-6 font-mono text-[12px] text-paper-dim">{String(i + 1).padStart(2, '0')}</span>
                  <KeyChip camelot={t.camelot} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-paper">{displayTitle(t)}</span>
                    <span className="block truncate text-[12px] text-paper-dim">
                      {t.artist} · {analysis.phases[i]}
                    </span>
                  </span>
                  <span className="font-mono text-[13px] font-bold text-mustard">{formatBpm(t.bpm)}</span>
                  <button type="button" onClick={() => toggleLock(t.id)} aria-pressed={locks.has(t.id)} aria-label={locks.has(t.id) ? 'Unlock' : 'Lock'} className="flex h-12 w-9 items-center justify-center">
                    {locks.has(t.id) ? <LockSimpleIcon size={20} weight="fill" className="text-rust" /> : <LockSimpleOpenIcon size={20} className="text-paper-dim" />}
                  </button>
                  <button type="button" onClick={() => remove(t.id)} aria-label={`Remove ${t.title}`} className="flex h-12 w-9 items-center justify-center text-paper-dim">
                    <XIcon size={18} />
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
        <PianoKey onClick={() => setPicker(true)}>
          <ListPlusIcon size={18} aria-hidden /> Add tracks
        </PianoKey>

        <label className="flex flex-col gap-1">
          <span className="text-[13px] text-paper-dim">Tags (comma separated)</span>
          <input
            value={d.tags.join(', ')}
            onChange={(e) => editor.set({ tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
            className="h-12 rounded-lg bg-walnut-2 px-3 text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[13px] text-paper-dim">Notes</span>
          <textarea
            value={d.notes}
            onChange={(e) => editor.set({ notes: e.target.value })}
            rows={3}
            className="rounded-lg bg-walnut-2 p-3 text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <PianoKey tone="rust" size="lg" className="col-span-2" onClick={save} disabled={!tracks.length} data-testid="save-set">
            Save to rack
          </PianoKey>
          {d.setId ? <ExportButton setId={d.setId} /> : null}
          {d.setId ? (
            <PianoKey
              tone="walnut"
              onClick={async () => {
                if (!confirmDelete) return setConfirmDelete(true)
                await deleteSet(d.setId!)
                toast('Set deleted')
                close()
              }}
            >
              <TrashIcon size={18} aria-hidden /> {confirmDelete ? 'Tap again' : 'Delete'}
            </PianoKey>
          ) : null}
        </div>
        <SectionLabel className="text-center">Swipe a row left to remove it · drag ⠿ to reorder</SectionLabel>
      </div>
      {picker ? (
        <TrackPicker open onClose={() => setPicker(false)} selected={d.trackIds} onDone={(ids) => setIds([...d.trackIds.filter((x) => ids.includes(x)), ...ids.filter((x) => !d.trackIds.includes(x))])} />
      ) : null}
    </Sheet>
  )
}
