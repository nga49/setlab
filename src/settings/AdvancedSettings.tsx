import { useState } from 'react'
import { z } from 'zod'
import { setSetting, useSettings } from '../db/settings'
import { DEFAULT_PRESETS } from '../engine/parties'
import { DEFAULT_GENRE_TABLE } from '../engine/genres'
import { PianoKey, SectionLabel } from '../ui/kit'
import { useToast } from '../ui/Toast'

const presetSchema = z.array(
  z.object({
    id: z.enum(['wedding', 'birthday', 'beach', 'club', 'houseparty', 'lounge', 'custom']),
    label: z.string(),
    emoji: z.string(),
    genres: z.record(z.string(), z.number().min(0).max(1)),
    bpm: z.tuple([z.number(), z.number()]),
    arc: z.enum(['full', 'peak', 'opener', 'closer', 'tension']),
    eraMode: z.enum(['nostalgia', 'recent', 'none']),
    maxArtistRepeats: z.number().int().min(0),
    defaultEnergy: z.number().min(1).max(10),
    noun: z.string(),
  }),
)

const genreSchema = z.object({
  families: z.array(z.object({ id: z.string(), label: z.string(), genres: z.array(z.string()), open: z.boolean().optional() })),
  bridges: z.array(z.tuple([z.string(), z.string()])),
  aliases: z.record(z.string(), z.string()),
})

function JsonEditor({ title, value, fallback, schema, onSave }: { title: string; value: unknown; fallback: unknown; schema: z.ZodType; onSave: (v: unknown | null) => Promise<void> }) {
  const toast = useToast()
  const [text, setText] = useState(() => JSON.stringify(value ?? fallback, null, 2))
  const [error, setError] = useState<string | null>(null)
  return (
    <details className="rounded-xl bg-walnut-2/60 p-3">
      <summary className="min-h-12 cursor-pointer py-3 text-[15px] font-bold text-paper">{title}</summary>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        spellCheck={false}
        aria-label={title}
        className="mt-2 w-full rounded-lg bg-walnut p-2 font-mono text-[12px] text-paper outline-none focus-visible:ring-2 focus-visible:ring-mustard"
      />
      {error ? <p className="text-[13px] text-[#E58A70]" role="alert">{error}</p> : null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <PianoKey
          tone="mustard"
          onClick={async () => {
            try {
              const parsed = schema.parse(JSON.parse(text))
              await onSave(parsed)
              setError(null)
              toast('Saved')
            } catch (e) {
              setError(e instanceof SyntaxError ? `JSON error: ${e.message}` : 'Some fields are missing or invalid.')
            }
          }}
        >
          Save
        </PianoKey>
        <PianoKey
          tone="walnut"
          onClick={async () => {
            await onSave(null)
            setText(JSON.stringify(fallback, null, 2))
            setError(null)
            toast('Back to defaults')
          }}
        >
          Defaults
        </PianoKey>
      </div>
    </details>
  )
}

/** Party presets and genre families editors (advanced, collapsible). */
export function AdvancedSettings() {
  const s = useSettings()
  return (
    <section className="flex flex-col gap-2" aria-labelledby="s-adv">
      <SectionLabel>
        <span id="s-adv">🧰 Advanced</span>
      </SectionLabel>
      <JsonEditor title="Party presets" value={s.partyPresets} fallback={DEFAULT_PRESETS} schema={presetSchema} onSave={(v) => setSetting('partyPresets', v)} />
      <JsonEditor title="Genre families" value={s.genreFamilies} fallback={DEFAULT_GENRE_TABLE} schema={genreSchema} onSave={(v) => setSetting('genreFamilies', v)} />
    </section>
  )
}
