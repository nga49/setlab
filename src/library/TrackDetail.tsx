import { useEffect, useState } from 'react'
import { useLibrary } from '../data/LibraryProvider'
import { displayTitle, type FieldName, type LibTrack } from '../data/effective'
import { db, nowIso } from '../db/db'
import type { Override } from '../db/types'
import { musicalName, parseKey } from '../engine/camelot'
import { allGenres } from '../engine/genres'
import { Sheet } from '../ui/Sheet'
import { Slider } from '../ui/Slider'
import { Chip, cx, formatDuration, KeyChip, PianoKey, SectionLabel, SourceBadge } from '../ui/kit'
import { useToast } from '../ui/Toast'
import { CopyButtons } from '../ui/CopyButtons'
import { EstimateButton } from '../ai/EstimateButton'
import { BUILTIN_TAGS, tagLabel } from './tags'

/** All fields with a source badge; edits are stored as local overrides (never overwritten by sync). */
export function TrackDetail({ track, onClose }: { track: LibTrack | null; onClose: () => void }) {
  const lib = useLibrary()
  const toast = useToast()
  const [energy, setEnergy] = useState(5)
  const [genre, setGenre] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [bpm, setBpm] = useState('')
  const [key, setKey] = useState('')
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    if (!track) return
    setEnergy(Math.round(track.energy))
    setGenre(track.genre ?? '')
    setTags(track.tags)
    setNotes(track.notes)
    setBpm(track.bpm ? String(track.bpm) : '')
    setKey(track.camelot ?? '')
  }, [track])

  if (!track) return null
  const editableCore = track.source !== 'rekordbox' || !track.bpm || !track.camelot
  const field = (name: FieldName, label: string, value: string) => (
    <div className="flex min-h-11 items-center justify-between gap-2" key={name}>
      <span className="text-[14px] text-paper-dim">{label}</span>
      <span className="flex items-center gap-1.5 font-mono text-[15px] text-paper">
        {value}
        <SourceBadge source={track.sources[name]} />
      </span>
    </div>
  )

  const save = async () => {
    const prev = await db.overrides.get(track.id)
    const o: Override = {
      ...(prev ?? {}),
      trackId: track.id,
      energy: energy !== Math.round(track.energy) || prev?.energy != null ? energy : null,
      genre: genre && genre !== (track.genre ?? '') ? genre : (prev?.genre ?? null),
      tags,
      notes,
      updatedAt: nowIso(),
    }
    if (editableCore) {
      const b = Number(bpm)
      if (b > 0 && b !== track.bpm) o.bpm = b
      const k = parseKey(key)
      if (k && k !== track.camelot) o.camelot = k
    }
    await db.overrides.put(o)
    toast('Saved on this phone')
    onClose()
  }

  const reset = async () => {
    await db.overrides.delete(track.id)
    toast('Back to rekordbox values')
    onClose()
  }

  const removeWishlist = async () => {
    await db.tracks.delete(track.id)
    await db.overrides.delete(track.id)
    toast('Removed from wishlist')
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={displayTitle(track)} full testId="track-detail">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <KeyChip camelot={track.camelot} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold text-paper">{track.artist}</p>
            <p className="font-mono text-[13px] text-paper-dim">
              {track.source === 'rekordbox' ? '🟢 rekordbox' : track.source === 'demo' ? '🧪 demo' : '✏️ wishlist'}
              {track.stored.label ? ` · ${track.stored.label}` : ''}
            </p>
          </div>
        </div>

        <section className="dashed-rows-dark rounded-xl bg-walnut-2 px-3" aria-label="Fields">
          {field('bpm', 'BPM', track.bpm ? String(track.bpm) : '?')}
          {field('camelot', 'Key', track.camelot ? `${track.camelot} · ${musicalName(track.camelot)}` : '?')}
          {field('genre', 'Genre', track.genre ?? '?')}
          {field('energy', 'Energy', String(Math.round(track.energy)))}
          {field('year', 'Year', track.year ? String(track.year) : '?')}
          <div className="flex min-h-11 items-center justify-between">
            <span className="text-[14px] text-paper-dim">Length</span>
            <span className="font-mono text-[15px] text-paper">{formatDuration(track.lengthSec)}</span>
          </div>
          {track.stored.dateAdded ? (
            <div className="flex min-h-11 items-center justify-between">
              <span className="text-[14px] text-paper-dim">Added</span>
              <span className="font-mono text-[15px] text-paper">{track.stored.dateAdded}</span>
            </div>
          ) : null}
          {track.stored.rating ? (
            <div className="flex min-h-11 items-center justify-between">
              <span className="text-[14px] text-paper-dim">Rating</span>
              <span className="font-mono text-[15px] text-mustard" aria-label={`${track.stored.rating} stars`}>{'★'.repeat(track.stored.rating)}</span>
            </div>
          ) : null}
          {track.stored.playlists?.length ? (
            <div className="py-2 text-[13px] text-paper-dim">Playlists: {track.stored.playlists.join(', ')}</div>
          ) : null}
          {track.stored.comment ? <div className="py-2 text-[13px] text-paper-dim">“{track.stored.comment}”</div> : null}
        </section>
        <p className="font-mono text-[11px] text-paper-dim">🟢 rekordbox · 🟡 AI estimate · ✏️ your edit · ≈ guess</p>

        {editableCore ? (
          <section className="flex flex-wrap items-end gap-2" aria-label="BPM and key">
            <label className="flex flex-col gap-1">
              <span className="text-[13px] text-paper-dim">BPM</span>
              <input inputMode="decimal" value={bpm} onChange={(e) => setBpm(e.target.value)} className="h-12 w-24 rounded-lg bg-walnut-2 px-3 font-mono text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[13px] text-paper-dim">Key</span>
              <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="8A / Am" className="h-12 w-28 rounded-lg bg-walnut-2 px-3 font-mono text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard" />
            </label>
            <EstimateButton track={track} onEstimate={(e) => (e.bpm && setBpm(String(e.bpm)), e.camelot && setKey(e.camelot), e.energy && setEnergy(e.energy), e.genre && setGenre(e.genre))} />
          </section>
        ) : null}

        <Slider label="Energy (your value)" value={energy} min={1} max={10} onChange={setEnergy} testId="detail-energy" />

        <label className="flex flex-col gap-1">
          <span className="text-[14px] text-paper-dim">Genre</span>
          <input list="genre-list" value={genre} onChange={(e) => setGenre(e.target.value)} className="h-12 rounded-lg bg-walnut-2 px-3 text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard" />
          <datalist id="genre-list">
            {allGenres(lib.genres).map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </label>

        <section className="flex flex-col gap-2" aria-label="Tags">
          <SectionLabel>Tags</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {BUILTIN_TAGS.map((t) => (
              <Chip key={t.id} active={tags.includes(t.id)} onClick={() => setTags((x) => (x.includes(t.id) ? x.filter((y) => y !== t.id) : [...x, t.id]))}>
                {t.emoji} {t.label}
              </Chip>
            ))}
            {tags
              .filter((t) => !BUILTIN_TAGS.some((b) => b.id === t))
              .map((t) => (
                <Chip key={t} active onClick={() => setTags((x) => x.filter((y) => y !== t))}>
                  {tagLabel(t)} ✕
                </Chip>
              ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const t = newTag.trim().toLowerCase().replace(/\s+/g, '-')
              if (t && !tags.includes(t)) setTags([...tags, t])
              setNewTag('')
            }}
          >
            <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add a tag" aria-label="New tag" className="h-12 min-w-0 flex-1 rounded-lg bg-walnut-2 px-3 text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard" />
            <PianoKey type="submit">Add</PianoKey>
          </form>
        </section>

        <label className="flex flex-col gap-1">
          <span className="text-[14px] text-paper-dim">Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-lg bg-walnut-2 p-3 text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard" />
        </label>

        {track.status === 'wishlist' ? <CopyButtons track={track} /> : null}

        <div className={cx('grid gap-2', track.status === 'wishlist' ? 'grid-cols-2' : 'grid-cols-2')}>
          <PianoKey tone="rust" size="lg" className="col-span-2" onClick={save} data-testid="detail-save">
            Save
          </PianoKey>
          <PianoKey tone="walnut" onClick={reset}>
            Reset edits
          </PianoKey>
          {track.status === 'wishlist' ? (
            <PianoKey tone="walnut" onClick={removeWishlist}>
              Remove
            </PianoKey>
          ) : (
            <PianoKey tone="walnut" onClick={onClose}>
              Close
            </PianoKey>
          )}
        </div>
      </div>
    </Sheet>
  )
}
