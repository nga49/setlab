import { useState } from 'react'
import { ArrowSquareOutIcon, ClipboardTextIcon } from '@phosphor-icons/react'
import { beatportSearchUrl, copyText, toBeatportQuery, type CopyTrack } from '../beatport'
import { cx } from './kit'
import { useToast } from './Toast'

/** 📋 Copy a Beatport-ready search string. Toggle Full / Short. "Open Beatport" is secondary. */
export function CopyButtons({ track, compact = false }: { track: CopyTrack; compact?: boolean }) {
  const [mode, setMode] = useState<'full' | 'short'>('full')
  const toast = useToast()
  const copy = async () => {
    const ok = await copyText(toBeatportQuery(track, mode))
    toast(ok ? 'Copied · paste in Beatport' : 'Copy failed', ok ? 'info' : 'error')
  }
  return (
    <div className={cx('flex flex-wrap items-center gap-1.5', compact && 'gap-1')}>
      <button
        type="button"
        onClick={copy}
        className="piano-key flex min-h-12 items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#F0B355] to-[#D8922C] px-3 font-mono text-[13px] font-bold text-ink shadow-[inset_0_-4px_0_#9C6417]"
        aria-label={`Copy for Beatport (${mode})`}
        data-testid="copy-beatport"
      >
        <ClipboardTextIcon size={18} aria-hidden /> Copy
      </button>
      <span className="flex rounded-lg bg-walnut-3/60 p-0.5" role="group" aria-label="Copy format">
        {(['full', 'short'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={cx('min-h-11 rounded-md px-2.5 font-mono text-[12px] font-bold', mode === m ? 'bg-paper text-ink' : 'text-paper-dim')}
          >
            {m === 'full' ? 'Full' : 'Short'}
          </button>
        ))}
      </span>
      {!compact ? (
        <a
          href={beatportSearchUrl(track)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center gap-1 px-2 font-mono text-[12px] text-teal-light underline"
        >
          <ArrowSquareOutIcon size={14} aria-hidden /> Beatport
        </a>
      ) : null}
    </div>
  )
}
