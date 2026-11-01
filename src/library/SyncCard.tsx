import { useState } from 'react'
import { ArrowsClockwiseIcon, WarningIcon } from '@phosphor-icons/react'
import { useSettings } from '../db/settings'
import { runSync } from '../data/sync'
import { useLibrary } from '../data/LibraryProvider'
import { useApp } from '../state/app'
import { cx } from '../ui/kit'
import { useToast } from '../ui/Toast'

function when(iso: string | null): string {
  if (!iso) return 'never'
  const d = new Date(iso)
  const today = new Date()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `today ${time}`
  const y = new Date(today.getTime() - 86400_000)
  if (d.toDateString() === y.toDateString()) return `yesterday ${time}`
  return `${d.toLocaleDateString()} ${time}`
}

/** "Last sync: today 21:04 · 1,248 tracks · +12 new", errors in plain words with the fix. */
export function SyncCard() {
  const s = useSettings()
  const lib = useLibrary()
  const app = useApp()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const configured = !!(s.dataRepo && s.dataToken)

  const sync = async () => {
    setBusy(true)
    const msg = await runSync({ force: false })
    setBusy(false)
    toast(msg)
  }

  if (!configured)
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-teal-light/50 p-3" data-testid="sync-card">
        <p className="flex-1 text-[14px] text-paper-dim">
          {lib.demo ? 'Demo library. ' : ''}Connect your rekordbox library: Settings › Library sync.
        </p>
        <button type="button" onClick={() => app.setSettingsOpen(true)} className="piano-key min-h-12 rounded-xl bg-teal px-3 font-mono text-[13px] font-bold text-paper">
          Set up
        </button>
      </div>
    )

  return (
    <div className={cx('flex items-center gap-3 rounded-2xl p-3', s.lastSyncError ? 'bg-rust/20' : 'bg-walnut-2')} data-testid="sync-card">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[13px] text-paper">
          Last sync: {when(s.lastSyncAt)} · {lib.syncedCount.toLocaleString()} tracks
          {s.lastSyncReport ? ` · ${s.lastSyncReport}` : ''}
        </p>
        {s.lastSyncError ? (
          <p className="mt-1 flex gap-1.5 text-[14px] text-paper" role="alert">
            <WarningIcon size={18} className="mt-0.5 shrink-0 text-mustard" aria-hidden />
            {s.lastSyncError}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        aria-label="Sync now"
        className="piano-key flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-walnut-3 text-paper"
        data-testid="sync-now"
      >
        <ArrowsClockwiseIcon size={22} className={busy ? 'reel-spin' : undefined} />
      </button>
    </div>
  )
}
