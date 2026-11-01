import { useRef, useState } from 'react'
import { exportBackup, importBackup, resetApp } from '../data/backup'
import { shareOrDownload } from '../practice/exports'
import { S } from '../strings'
import { Chip, PianoKey, SectionLabel } from '../ui/kit'
import { useToast } from '../ui/Toast'

/** Backup export / import (one JSON file) and reset (docs/DATA.md §7). */
export function BackupSettings() {
  const toast = useToast()
  const [secrets, setSecrets] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  const doExport = async () => {
    const b = await exportBackup(secrets)
    const name = `setlab-backup-${b.exportedAt.slice(0, 10)}.json`
    const r = await shareOrDownload(name, JSON.stringify(b), 'application/json')
    if (r !== 'cancelled') toast(secrets ? 'Backup saved (includes keys: keep it private)' : 'Backup saved')
  }
  const doImport = async (f: File) => {
    try {
      const { rows } = await importBackup(JSON.parse(await f.text()))
      toast(`Restored ${rows} items`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed', 'error')
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="s-backup">
      <SectionLabel>
        <span id="s-backup">💾 {S.settings.backup}</span>
      </SectionLabel>
      <p className="text-[13px] text-paper-dim">One JSON file with your sets, tags, ratings, history, wishlist and settings. Your synced library is not included (it comes back with sync).</p>
      <Chip active={secrets} onClick={() => setSecrets(!secrets)} className="self-start">
        {secrets ? '✓ ' : ''}Include API key and tokens
      </Chip>
      <div className="grid grid-cols-2 gap-2">
        <PianoKey onClick={doExport} data-testid="backup-export">
          Export
        </PianoKey>
        <PianoKey onClick={() => file.current?.click()} data-testid="backup-import">
          Import
        </PianoKey>
      </div>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Backup file"
        data-testid="backup-file"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void doImport(f)
          e.target.value = ''
        }}
      />
      <PianoKey
        tone="walnut"
        onClick={async () => {
          if (!confirm) return setConfirm(true)
          await resetApp()
          location.reload()
        }}
        data-testid="reset-app"
      >
        {confirm ? 'Tap again: erase everything on this phone' : 'Reset app'}
      </PianoKey>
    </section>
  )
}
