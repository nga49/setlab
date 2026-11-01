import { useState } from 'react'
import { db, nowIso, uid } from '../db/db'
import type { StoredTrack } from '../db/types'
import { parseKey } from '../engine/camelot'
import { EstimateButton } from '../ai/EstimateButton'
import type { EstimateResult } from '../ai/types'
import { Sheet } from '../ui/Sheet'
import { PianoKey } from '../ui/kit'
import { useToast } from '../ui/Toast'

/** Quick-add on the go: a wishlist track until the next sync finds it (docs/DATA.md §3). */
export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [f, setF] = useState({ artist: '', title: '', remix: '', bpm: '', key: '', genre: '', year: '' })
  const [est, setEst] = useState<EstimateResult | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.title.trim()) {
      toast('Add at least a title', 'error')
      return
    }
    const id = uid('local:')
    const t: StoredTrack = {
      id,
      artist: f.artist.trim(),
      title: f.title.trim(),
      remix: f.remix.trim() || null,
      genre: f.genre.trim() || null,
      bpm: Number(f.bpm) || null,
      keyRaw: f.key || null,
      camelot: parseKey(f.key),
      lengthSec: null,
      year: Number(f.year) || null,
      source: 'local',
      status: 'wishlist',
      dateAdded: nowIso().slice(0, 10),
    }
    await db.tracks.put(t)
    if (est) {
      await db.estimates.put({ trackId: id, bpm: est.bpm, camelot: est.camelot, keyName: est.keyName, genre: est.genre, energy: est.energy, year: est.year, confidence: est.confidence, note: est.note, model: 'claude', date: nowIso() })
    }
    toast('Added to wishlist')
    setF({ artist: '', title: '', remix: '', bpm: '', key: '', genre: '', year: '' })
    setEst(null)
    onClose()
  }

  const input = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] text-paper-dim">{label}</span>
      <input value={f[k]} onChange={set(k)} {...props} className="h-12 rounded-lg bg-walnut-2 px-3 text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard" data-testid={`qa-${k}`} />
    </label>
  )

  return (
    <Sheet open={open} onClose={onClose} title="Add a track" testId="quick-add">
      <div className="flex flex-col gap-3">
        {input('artist', 'Artist')}
        {input('title', 'Title')}
        {input('remix', 'Remix (optional)')}
        <EstimateButton
          track={{ artist: f.artist, title: f.title, remix: f.remix || null }}
          onEstimate={(e) => {
            setEst(e)
            setF((x) => ({ ...x, bpm: e.bpm ? String(e.bpm) : x.bpm, key: e.camelot ?? x.key, genre: e.genre ?? x.genre, year: e.year ? String(e.year) : x.year }))
          }}
        />
        <div className="grid grid-cols-2 gap-2">
          {input('bpm', 'BPM', { inputMode: 'decimal' })}
          {input('key', 'Key (8A / Am)')}
          {input('genre', 'Genre')}
          {input('year', 'Year', { inputMode: 'numeric' })}
        </div>
        {est ? <p className="text-[13px] text-mustard">🟡 estimated ({est.confidence} confidence){est.note ? ` · ${est.note}` : ''}</p> : null}
        <PianoKey tone="rust" size="lg" onClick={save} data-testid="qa-save">
          Add to wishlist
        </PianoKey>
      </div>
    </Sheet>
  )
}
