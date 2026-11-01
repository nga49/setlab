import { useRef, useState } from 'react'
import { setSetting, useSettings } from '../db/settings'
import { S } from '../strings'
import { PianoKey, SectionLabel } from '../ui/kit'
import { useToast } from '../ui/Toast'
import { applyTitleFont, readFontFile } from '../ui/titleFont'

/** Title font picked from a file on this phone. It stays on the device (see ui/titleFont.ts). */
export function LookSettings() {
  const s = useSettings()
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (f: File) => {
    setBusy(true)
    try {
      const font = await readFontFile(f)
      await applyTitleFont(font)
      await setSetting('titleFont', font)
      toast(`Title font: ${font.name}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not use this font', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="s-look">
      <SectionLabel>
        <span id="s-look">🎨 {S.settings.look}</span>
      </SectionLabel>
      <p className="text-[15px] text-paper" data-testid="title-font-name">
        Title font: <span className="font-title text-mustard">{s.titleFont ? s.titleFont.name : 'Default'}</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <PianoKey onClick={() => file.current?.click()} disabled={busy} data-testid="title-font-pick">
          Choose font file
        </PianoKey>
        <PianoKey
          tone="walnut"
          disabled={!s.titleFont || busy}
          onClick={async () => {
            await applyTitleFont(null)
            await setSetting('titleFont', null)
            toast('Default title font')
          }}
          data-testid="title-font-reset"
        >
          Use default
        </PianoKey>
      </div>
      {/* No accept filter: iOS greys out font files it has no type for. The file is checked when loaded. */}
      <input
        ref={file}
        type="file"
        className="hidden"
        aria-label="Font file"
        data-testid="title-font-file"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void pick(f)
          e.target.value = ''
        }}
      />
      <p className="text-[12px] text-paper-dim">
        A .ttf, .otf, .woff or .woff2 file from Files. It is used for screen titles and the app name, stays on this phone (and in your backups) and is never uploaded.
      </p>
    </section>
  )
}
