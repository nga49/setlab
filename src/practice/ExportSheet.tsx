import { useState } from 'react'
import { ExportIcon } from '@phosphor-icons/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useLibrary } from '../data/LibraryProvider'
import { copyText } from '../beatport'
import { resolveTracks } from '../sets/actions'
import { Sheet } from '../ui/Sheet'
import { PianoKey } from '../ui/kit'
import { useToast } from '../ui/Toast'
import { exportFileName, shareOrDownload, toM3u, toRekordboxXml, toText } from './exports'

/** Export a saved set: rekordbox XML, text, M3U, via the share sheet or a download. */
export function ExportSheet({ setId, onClose }: { setId: string; onClose: () => void }) {
  const lib = useLibrary()
  const toast = useToast()
  const set = useLiveQuery(() => db.sets.get(setId), [setId])
  if (!set) return null
  const tracks = resolveTracks(set.trackIds, set.items, lib)

  const xml = async () => {
    const { xml: content, skipped } = toRekordboxXml(set.name, tracks, __APP_VERSION__)
    const r = await shareOrDownload(exportFileName(set.name, 'xml'), content, 'application/xml')
    if (r !== 'cancelled') toast(skipped ? `Exported · ${skipped} track(s) not from rekordbox skipped` : 'Exported for rekordbox')
  }
  const text = async () => {
    const ok = await copyText(toText(set.name, tracks))
    toast(ok ? 'Track list copied' : 'Copy failed', ok ? 'info' : 'error')
  }
  const m3u = async () => {
    const r = await shareOrDownload(exportFileName(set.name, 'm3u'), toM3u(set.name, tracks), 'audio/x-mpegurl')
    if (r !== 'cancelled') toast('M3U exported')
  }

  return (
    <Sheet open onClose={onClose} title="Export" testId="export-sheet">
      <div className="flex flex-col gap-3">
        <p className="font-marker text-[22px] text-paper">{set.name}</p>
        <PianoKey tone="rust" size="lg" onClick={xml} data-testid="export-xml">
          Send to rekordbox (XML)
        </PianoKey>
        <p className="text-[13px] text-paper-dim">
          Save the file to your laptop's Downloads folder. The sync tool turns it into a playlist rekordbox can import (see sync/README).
        </p>
        <PianoKey onClick={text} data-testid="export-text">
          Copy as text
        </PianoKey>
        <PianoKey onClick={m3u} data-testid="export-m3u">
          M3U file
        </PianoKey>
        <p className="text-[12px] text-paper-dim">M3U lists names and rekordbox ids (no file paths on the phone).</p>
      </div>
    </Sheet>
  )
}

export function ExportButton({ setId }: { setId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <PianoKey onClick={() => setOpen(true)} data-testid="open-export">
        <ExportIcon size={18} aria-hidden /> Export
      </PianoKey>
      {open ? <ExportSheet setId={setId} onClose={() => setOpen(false)} /> : null}
    </>
  )
}
