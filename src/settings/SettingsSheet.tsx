import { APP_NAME } from '../config'
import { S } from '../strings'
import { useApp } from '../state/app'
import { setSetting, useSettings } from '../db/settings'
import { Sheet } from '../ui/Sheet'
import { Chip, SectionLabel } from '../ui/kit'

export function SettingsSheet() {
  const app = useApp()
  const s = useSettings()
  return (
    <Sheet open={app.settingsOpen} onClose={() => app.setSettingsOpen(false)} title={S.titles.settings} full testId="settings-sheet">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <SectionLabel>{S.settings.demo}</SectionLabel>
          <div className="flex gap-2">
            {(['auto', 'on', 'off'] as const).map((m) => (
              <Chip key={m} active={s.demoMode === m} onClick={() => setSetting('demoMode', m)}>
                {m === 'auto' ? S.settings.demoAuto : m === 'on' ? S.settings.demoOn : S.settings.demoOff}
              </Chip>
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-1 text-[13px] text-paper-dim">
          <SectionLabel>{S.settings.about}</SectionLabel>
          <p>{APP_NAME} · v{__APP_VERSION__}</p>
        </section>
      </div>
    </Sheet>
  )
}
