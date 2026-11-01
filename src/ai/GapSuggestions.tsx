import { useState } from 'react'
import type { Gap, PartyPreset } from '../engine/parties'
import { useLibrary } from '../data/LibraryProvider'
import type { MissingItem } from '../db/types'
import { saveDiscovered } from '../missing/store'
import { CopyButtons } from '../ui/CopyButtons'
import { discover, ownedForPrompt, partyGapRequest } from './features'
import { useAiCall } from './useAiCall'

/** AI picks for a party gap; they also go to the Missing list. */
export function GapSuggestions({ gap, preset }: { gap: Gap; preset: PartyPreset }) {
  const lib = useLibrary()
  const { busy, run } = useAiCall()
  const [items, setItems] = useState<MissingItem[] | null>(null)
  const go = async () => {
    const owned = ownedForPrompt(lib.owned, { genres: gap.genre ? [gap.genre] : undefined })
    const r = await run((o) => discover(partyGapRequest(gap, preset, owned), o))
    if (r) setItems(await saveDiscovered(r.tracks, 'party', gap.label, lib.tracks))
  }
  if (!items)
    return (
      <button type="button" onClick={go} disabled={busy} className="piano-key min-h-12 self-start rounded-lg bg-teal px-3 font-mono text-[13px] font-bold text-paper disabled:opacity-60">
        🟣 {busy ? 'Searching…' : 'Suggest tracks'}
      </button>
    )
  return (
    <ul className="flex flex-col gap-2">
      {items.map((m) => (
        <li key={m.id} className="flex flex-col gap-1 rounded-lg bg-paper/60 p-2">
          <span className="text-[14px] font-bold text-ink">
            {m.status === 'owned' ? '🟢 ' : '🔴 '}
            {m.artist} · {m.title}
            {m.remix ? ` (${m.remix})` : ''}
          </span>
          <span className="font-mono text-[12px] text-ink-soft">
            🟡 {m.estBpm ?? '?'} BPM · {m.estCamelot ?? '?'} · {m.year ?? '?'}
          </span>
          {m.status !== 'owned' ? <CopyButtons track={m} compact /> : null}
        </li>
      ))}
    </ul>
  )
}
