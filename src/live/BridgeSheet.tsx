import { useMemo, useState } from 'react'
import { useLibrary } from '../data/LibraryProvider'
import { displayTitle } from '../data/effective'
import { TrackPicker } from '../sets/TrackPicker'
import { Sheet } from '../ui/Sheet'
import { KeyChip, PianoKey, ScoreText, SectionLabel } from '../ui/kit'

/** Bridge finder: the 3 best single-track bridges and the best 2-track bridge from A to B. */
export function BridgeSheet({ open, onClose, initialA, initialB }: { open: boolean; onClose: () => void; initialA?: string | null; initialB?: string | null }) {
  const lib = useLibrary()
  const [a, setA] = useState<string | null>(initialA ?? null)
  const [b, setB] = useState<string | null>(initialB ?? null)
  const [picking, setPicking] = useState<'a' | 'b' | null>(null)
  const ta = a ? lib.byId.get(a) : undefined
  const tb = b ? lib.byId.get(b) : undefined
  const res = useMemo(() => (ta && tb ? lib.graph().bridges(ta.id, tb.id) : null), [ta, tb, lib])

  const Slot = ({ label, id, onPick }: { label: string; id: string | null; onPick: () => void }) => {
    const t = id ? lib.byId.get(id) : undefined
    return (
      <button type="button" onClick={onPick} className="piano-key flex min-h-14 w-full items-center gap-2 rounded-xl bg-walnut-2 px-3 text-left" data-testid={`bridge-${label}`}>
        <span className="w-6 font-mono text-[14px] font-bold text-mustard">{label}</span>
        {t ? (
          <>
            <KeyChip camelot={t.camelot} size="sm" />
            <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-paper">{displayTitle(t)}</span>
          </>
        ) : (
          <span className="text-[15px] text-paper-dim">Pick a track</span>
        )}
      </button>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title="Bridge finder" full testId="bridge-sheet">
      <div className="flex flex-col gap-3">
        <Slot label="A" id={a} onPick={() => setPicking('a')} />
        <Slot label="B" id={b} onPick={() => setPicking('b')} />
        {res ? (
          <>
            <SectionLabel>Best single bridges</SectionLabel>
            <ul className="dashed-rows-dark rounded-xl bg-walnut-2/50" data-testid="bridge-singles">
              {res.singles.map((s) => (
                <li key={s.track.id} className="flex min-h-14 items-center gap-2 px-2">
                  <KeyChip camelot={s.track.camelot} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-paper">{displayTitle(s.track)}</span>
                    <span className="block truncate font-mono text-[12px] text-paper-dim">
                      A→X {Math.round(s.s1)} · X→B {Math.round(s.s2)}
                    </span>
                  </span>
                  <span className="font-mono text-[14px] font-bold text-mustard">{s.track.bpm ? Math.round(s.track.bpm) : '?'}</span>
                  <ScoreText score={s.min} className="text-[13px]" />
                </li>
              ))}
            </ul>
            {res.double ? (
              <>
                <SectionLabel>Best 2-track bridge</SectionLabel>
                <div className="flex flex-col gap-1 rounded-xl bg-walnut-2/50 p-2" data-testid="bridge-double">
                  {res.double.tracks.map((t, i) => (
                    <div key={t.id} className="flex min-h-12 items-center gap-2">
                      <span className="w-5 font-mono text-[12px] text-paper-dim">{i + 1}</span>
                      <KeyChip camelot={t.camelot} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-paper">{displayTitle(t)}</span>
                      <span className="font-mono text-[13px] text-mustard">{t.bpm ? Math.round(t.bpm) : '?'}</span>
                    </div>
                  ))}
                  <p className="font-mono text-[12px] text-paper-dim">
                    {res.double.scores.map((s) => Math.round(s)).join(' → ')} · weakest <ScoreText score={res.double.min} />
                  </p>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <p className="text-[14px] text-paper-dim">Pick A (playing) and B (where you want to go).</p>
        )}
        <PianoKey tone="walnut" onClick={onClose}>
          Done
        </PianoKey>
      </div>
      {picking ? (
        <TrackPicker
          open
          single
          title={picking === 'a' ? 'Track A' : 'Track B'}
          selected={[]}
          onClose={() => setPicking(null)}
          onDone={([id]) => (picking === 'a' ? setA(id ?? null) : setB(id ?? null))}
        />
      ) : null}
    </Sheet>
  )
}
