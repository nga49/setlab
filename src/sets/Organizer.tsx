import { useRef, useState } from 'react'
import { ClipboardTextIcon, ListPlusIcon, LockSimpleIcon, LockSimpleOpenIcon, ArrowCounterClockwiseIcon, XIcon } from '@phosphor-icons/react'
import { useLibrary } from '../data/LibraryProvider'
import { displayTitle } from '../data/effective'
import { ARCS, ARC_IDS } from '../engine/arcs'
import { analyzeSet, type SetResult } from '../engine/generate'
import type { EngineTrack, Mode } from '../engine/types'
import { runGenerate } from '../engine/workerClient'
import { useStore } from '../state/store'
import { Chip, cx, EmptyState, KeyChip, PianoKey, Reel, SectionLabel } from '../ui/kit'
import { useToast } from '../ui/Toast'
import { bridgeAt, generationLibrary, swapAt } from './actions'
import { editor, MODE_LABEL, organizer } from './draft'
import { PasteSheet } from './PasteSheet'
import { TrackPicker } from './TrackPicker'
import { VersionCard } from './VersionCard'

const DURATIONS = [30, 60, 90, 120]

export function Organizer() {
  const lib = useLibrary()
  const d = useStore(organizer)
  const toast = useToast()
  const [picker, setPicker] = useState(false)
  const [paste, setPaste] = useState(false)
  const [custom, setCustom] = useState('')
  const carousel = useRef<HTMLDivElement>(null)
  const locks = new Set(d.locks)

  const pickedTracks = d.picked.map((id) => lib.byId.get(id)).filter((t): t is NonNullable<typeof t> => !!t)

  const build = async (seed = d.seed) => {
    if (!pickedTracks.length && d.poolMode === 'picked') {
      toast('Pick some tracks first', 'error')
      return
    }
    organizer.set({ generating: true, seed })
    try {
      const results = await runGenerate(generationLibrary(lib, d.picked), {
        arc: d.arc,
        targetSec: d.durationMin ? d.durationMin * 60 : null,
        overlapSec: lib.overlapSec,
        locks: d.locks,
        pinFirst: d.pinFirst,
        pinLast: d.pinLast,
        picked: d.picked,
        poolMode: d.durationMin ? d.poolMode : 'picked',
        seed,
        ctx: lib.ctx,
      })
      organizer.set({ results, generating: false })
      requestAnimationFrame(() => scrollTo(d.focusMode, results))
    } catch (e) {
      organizer.set({ generating: false })
      toast(e instanceof Error ? e.message : 'Generation failed', 'error')
    }
  }

  const scrollTo = (mode: Mode, results = d.results) => {
    const idx = results?.findIndex((r) => r.mode === mode) ?? -1
    const el = carousel.current?.children[idx] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }

  const updateResult = (idx: number, tracks: EngineTrack[] | null) => {
    if (!tracks || !d.results) {
      toast('Nothing in the library fits better', 'error')
      return
    }
    const r = d.results[idx]!
    const next = analyzeSet(tracks, { mode: r.mode, arc: r.mode === 'journey' ? d.arc : 'gentle', overlapSec: lib.overlapSec, ctx: lib.ctx, targetSec: r.targetSec })
    next.warnings = r.warnings
    const results = d.results.slice()
    results[idx] = next
    organizer.set({ results })
  }

  const edit = (r: SetResult) => {
    editor.set({
      open: true,
      setId: null,
      name: '',
      mode: r.mode,
      arc: r.mode === 'journey' ? d.arc : 'gentle',
      trackIds: r.tracks.map((t) => t.id),
      locks: d.locks,
      pinFirst: d.pinFirst,
      pinLast: d.pinLast,
      notes: '',
      tags: [],
      kind: 'organizer',
      createdAt: null,
    })
  }

  const toggleLock = (id: string) => {
    if (locks.has(id)) organizer.set({ locks: d.locks.filter((x) => x !== id) })
    else if (d.locks.length >= 3) toast('Lock up to 3 tracks', 'error')
    else organizer.set({ locks: [...d.locks, id] })
  }
  const pin = (id: string, where: 'first' | 'last') => {
    if (where === 'first') organizer.set({ pinFirst: d.pinFirst === id ? null : id, pinLast: d.pinLast === id ? null : d.pinLast })
    else organizer.set({ pinLast: d.pinLast === id ? null : id, pinFirst: d.pinFirst === id ? null : d.pinFirst })
  }
  const remove = (id: string) =>
    organizer.set({
      picked: d.picked.filter((x) => x !== id),
      locks: d.locks.filter((x) => x !== id),
      pinFirst: d.pinFirst === id ? null : d.pinFirst,
      pinLast: d.pinLast === id ? null : d.pinLast,
    })

  return (
    <div className="flex flex-col gap-5">
      {/* Input */}
      <section className="flex flex-col gap-3" aria-label="Tracks">
        <div className="grid grid-cols-2 gap-2">
          <PianoKey onClick={() => setPicker(true)} data-testid="open-picker">
            <ListPlusIcon size={20} aria-hidden /> Pick
          </PianoKey>
          <PianoKey onClick={() => setPaste(true)} data-testid="open-paste">
            <ClipboardTextIcon size={20} aria-hidden /> Paste list
          </PianoKey>
        </div>
        {pickedTracks.length ? (
          <div className="rounded-2xl bg-walnut-2/60 p-2">
            <div className="mb-1 flex items-center justify-between px-1">
              <SectionLabel>{pickedTracks.length} picked · {d.locks.length}/3 locked</SectionLabel>
              <button type="button" className="min-h-12 px-2 font-mono text-[12px] text-paper-dim underline" onClick={() => organizer.set({ picked: [], locks: [], pinFirst: null, pinLast: null })}>
                clear
              </button>
            </div>
            <ul className="dashed-rows-dark" data-testid="picked-list">
              {pickedTracks.map((t) => (
                <li key={t.id} className="flex min-h-14 items-center gap-2 px-1">
                  <KeyChip camelot={t.camelot} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-paper">{displayTitle(t)}</span>
                    <span className="block truncate text-[12px] text-paper-dim">
                      {t.artist}
                      {t.status === 'wishlist' ? ' · wishlist' : ''}
                    </span>
                  </span>
                  <button type="button" onClick={() => pin(t.id, 'first')} aria-pressed={d.pinFirst === t.id} aria-label="Pin first" className={cx('h-12 w-10 rounded-lg font-mono text-[12px] font-bold', d.pinFirst === t.id ? 'bg-mustard text-ink' : 'text-paper-dim')}>
                    1st
                  </button>
                  <button type="button" onClick={() => pin(t.id, 'last')} aria-pressed={d.pinLast === t.id} aria-label="Pin last" className={cx('h-12 w-10 rounded-lg font-mono text-[12px] font-bold', d.pinLast === t.id ? 'bg-mustard text-ink' : 'text-paper-dim')}>
                    end
                  </button>
                  <button type="button" onClick={() => toggleLock(t.id)} aria-pressed={locks.has(t.id)} aria-label={locks.has(t.id) ? 'Unlock' : 'Lock (must play)'} className="flex h-12 w-10 items-center justify-center" data-testid={`lock-${t.id}`}>
                    {locks.has(t.id) ? <LockSimpleIcon size={22} weight="fill" className="text-rust" /> : <LockSimpleOpenIcon size={22} className="text-paper-dim" />}
                  </button>
                  <button type="button" onClick={() => remove(t.id)} aria-label="Remove" className="flex h-12 w-9 items-center justify-center text-paper-dim">
                    <XIcon size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[14px] text-paper-dim">Pick tracks or paste a list. With "fill from library", the engine builds around them. Lock up to 3 must-plays.</p>
        )}
      </section>

      {/* Options */}
      <section className="flex flex-col gap-4" aria-label="Options">
        <div className="flex flex-col gap-2">
          <SectionLabel>Duration</SectionLabel>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <Chip active={d.durationMin === null} onClick={() => organizer.set({ durationMin: null })}>All picked</Chip>
            {DURATIONS.map((m) => (
              <Chip key={m} active={d.durationMin === m} onClick={() => organizer.set({ durationMin: m })}>
                {m} min
              </Chip>
            ))}
            <label className={cx('flex min-h-12 shrink-0 items-center gap-1 rounded-full border px-3', d.durationMin && !DURATIONS.includes(d.durationMin) ? 'border-mustard' : 'border-walnut-3')}>
              <input
                inputMode="numeric"
                placeholder="custom"
                aria-label="Custom duration in minutes"
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value)
                  const n = Number(e.target.value)
                  if (n >= 5 && n <= 600) organizer.set({ durationMin: n })
                }}
                className="w-16 bg-transparent font-mono text-[14px] text-paper outline-none placeholder:text-paper-dim"
              />
              <span className="text-[13px] text-paper-dim">min</span>
            </label>
          </div>
        </div>
        {d.durationMin ? (
          <div className="flex flex-col gap-2">
            <SectionLabel>Pool</SectionLabel>
            <div className="flex gap-2">
              <Chip active={d.poolMode === 'picked'} onClick={() => organizer.set({ poolMode: 'picked' })}>Only picked</Chip>
              <Chip active={d.poolMode === 'fill'} onClick={() => organizer.set({ poolMode: 'fill' })}>+ fill from library</Chip>
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <SectionLabel>🔥 Journey arc</SectionLabel>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {ARC_IDS.map((a) => (
              <Chip key={a} active={d.arc === a} onClick={() => organizer.set({ arc: a })}>
                {ARCS[a].label}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <PianoKey tone="rust" size="lg" className="flex-1" onClick={() => build(d.seed)} disabled={d.generating} data-testid="build">
          {d.generating ? 'Building…' : '▶ Build 3 versions'}
        </PianoKey>
        {d.generating ? (
          <span className="flex gap-1" aria-hidden>
            <Reel spinning bpm={124} size={40} />
            <Reel spinning bpm={124} size={40} />
          </span>
        ) : null}
      </div>

      {/* Output */}
      {d.results ? (
        <section className="flex flex-col gap-3" aria-label="Versions">
          <div className="flex items-center gap-2">
            {(['smooth', 'journey', 'keytour'] as Mode[]).map((m) => (
              <Chip key={m} active={d.focusMode === m} onClick={() => (organizer.set({ focusMode: m }), scrollTo(m))}>
                {MODE_LABEL[m].emoji} {MODE_LABEL[m].label}
              </Chip>
            ))}
          </div>
          <div ref={carousel} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2" data-testid="versions">
            {d.results.map((r, idx) => (
              <div key={r.mode} className="w-[86vw] max-w-[520px] shrink-0 snap-start">
                <VersionCard
                  r={r}
                  locks={locks}
                  onSwap={(i) => updateResult(idx, swapAt(r.tracks, i, lib, r.mode, locks))}
                  onBridge={(i) => updateResult(idx, bridgeAt(r.tracks, i, lib))}
                  onEdit={() => edit(r)}
                />
              </div>
            ))}
          </div>
          <PianoKey onClick={() => build(Math.floor(Math.random() * 1e6) + 2)} disabled={d.generating} data-testid="regenerate">
            <ArrowCounterClockwiseIcon size={18} aria-hidden /> Regenerate (keeps locks)
          </PianoKey>
        </section>
      ) : !pickedTracks.length && !lib.tracks.length ? (
        <EmptyState title="No library yet" hint="Turn on demo mode or set up library sync in Settings." />
      ) : null}

      {picker ? (
        <TrackPicker open onClose={() => setPicker(false)} selected={d.picked} onDone={(ids) => organizer.set({ picked: ids, locks: d.locks.filter((l) => ids.includes(l)) })} />
      ) : null}
      {paste ? <PasteSheet open onClose={() => setPaste(false)} onDone={(ids) => organizer.set({ picked: [...new Set([...d.picked, ...ids])] })} /> : null}
    </div>
  )
}
