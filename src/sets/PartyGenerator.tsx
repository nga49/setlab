import { useLibrary } from '../data/LibraryProvider'
import { DEFAULT_PRESETS, presetById, type PartyPreset } from '../engine/parties'
import { runParty } from '../engine/workerClient'
import { useSettings } from '../db/settings'
import { useStore } from '../state/store'
import { Chip, PianoKey, Reel, SectionLabel } from '../ui/kit'
import { RangeSlider, Slider } from '../ui/Slider'
import { useToast } from '../ui/Toast'
import { editor, party } from './draft'
import { VersionCard } from './VersionCard'
import { SetList } from './SetList'
import { GapCard } from './GapCard'

const NOW = new Date().getFullYear()

export function PartyGenerator() {
  const lib = useLibrary()
  const d = useStore(party)
  const settings = useSettings()
  const toast = useToast()
  const presets = (settings.partyPresets as PartyPreset[] | null) ?? DEFAULT_PRESETS
  const preset = presetById(d.type, presets)

  const generate = async (seed = d.seed) => {
    party.set({ generating: true, seed })
    try {
      const result = await runParty(
        lib.owned,
        preset,
        { crowdAge: d.crowdAge, era: d.eraOn ? d.era : null, energy: d.energy, durationSec: d.durationMin * 60, freeText: d.freeText, nowYear: NOW },
        lib.ctx,
        lib.overlapSec,
        seed,
      )
      party.set({ result, generating: false })
    } catch (e) {
      party.set({ generating: false })
      toast(e instanceof Error ? e.message : 'Generation failed', 'error')
    }
  }

  const r = d.result?.result
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2" aria-label="Party type">
        <SectionLabel>Party</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Chip key={p.id} active={d.type === p.id} onClick={() => party.set({ type: p.id, energy: p.defaultEnergy })}>
              <span aria-hidden>{p.emoji}</span> {p.label}
            </Chip>
          ))}
        </div>
        <p className="font-mono text-[12px] text-paper-dim">
          BPM {preset.bpm[0]} to {preset.bpm[1]} · {Object.keys(preset.genres).length || 'all'} genres · arc {preset.arc}
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl bg-walnut-2/60 p-3" aria-label="Crowd">
        <Slider label="Crowd age" value={d.crowdAge} min={18} max={70} onChange={(v) => party.set({ crowdAge: v })} testId="party-age" />
        <div className="flex flex-col gap-2">
          <Chip active={d.eraOn} onClick={() => party.set({ eraOn: !d.eraOn })} className="self-start">
            {d.eraOn ? '✓ Era filter on' : 'Era filter off'}
          </Chip>
          {d.eraOn ? <RangeSlider label="Era" value={d.era} min={1970} max={NOW} onChange={(v) => party.set({ era: v })} /> : null}
        </div>
        <Slider label="Energy" value={d.energy} min={1} max={10} onChange={(v) => party.set({ energy: v })} />
        <Slider label="Duration" value={d.durationMin} min={30} max={240} step={15} onChange={(v) => party.set({ durationMin: v })} format={(v) => `${v} min`} />
        <label className="flex flex-col gap-1">
          <span className="text-[14px] text-paper-dim">Wishes (optional)</span>
          <input
            value={d.freeText}
            onChange={(e) => party.set({ freeText: e.target.value })}
            placeholder="lots of 2000s R&B, no hard techno"
            className="h-12 rounded-lg bg-walnut px-3 text-paper outline-none placeholder:text-paper-dim/60 focus-visible:ring-2 focus-visible:ring-mustard"
            data-testid="party-text"
          />
        </label>
      </section>

      <div className="flex items-center gap-3">
        <PianoKey tone="rust" size="lg" className="flex-1" onClick={() => generate(d.seed)} disabled={d.generating} data-testid="party-build">
          {d.generating ? 'Building…' : `▶ Build ${preset.label.toLowerCase()} set`}
        </PianoKey>
        {d.generating ? (
          <span className="flex gap-1" aria-hidden>
            <Reel spinning bpm={120} size={40} />
            <Reel spinning bpm={120} size={40} />
          </span>
        ) : null}
      </div>

      {r && d.result ? (
        <section className="flex flex-col gap-3" aria-label="Party set" data-testid="party-result">
          <p className="font-mono text-[12px] text-paper-dim">
            {d.result.allowedCount} library tracks fit the filters · {d.result.gaps.length} gaps
          </p>
          <VersionCard r={r} showList={false} title={`${preset.emoji} ${preset.label}`} />
          <div className="paper rounded-[14px] p-3">
            <SetList
              tracks={r.tracks}
              transitions={r.transitions}
              phases={r.phases}
              insertBefore={(i) =>
                d.result!.gaps.filter((g) => g.position === i).map((g, k) => <GapCard key={`${i}-${k}`} gap={g} preset={preset} />)
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PianoKey onClick={() => generate(Math.floor(Math.random() * 1e6) + 2)} disabled={d.generating}>
              ↻ Again
            </PianoKey>
            <PianoKey
              tone="mustard"
              onClick={() =>
                editor.set({
                  open: true,
                  setId: null,
                  name: `${preset.label} set`,
                  mode: 'journey',
                  arc: preset.arc,
                  trackIds: r.tracks.map((t) => t.id),
                  locks: [],
                  pinFirst: null,
                  pinLast: null,
                  notes: d.freeText,
                  tags: [preset.label.toLowerCase()],
                  kind: 'party',
                  createdAt: null,
                })
              }
            >
              Edit &amp; save
            </PianoKey>
          </div>
        </section>
      ) : null}
    </div>
  )
}
