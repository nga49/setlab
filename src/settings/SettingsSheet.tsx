import { useEffect, useState } from 'react'
import { APP_NAME } from '../config'
import { S } from '../strings'
import { useApp } from '../state/app'
import { setSetting, setSettings, useSettings } from '../db/settings'
import { runSync, testConnection, validRepo } from '../data/sync'
import { Sheet } from '../ui/Sheet'
import { Chip, cx, PianoKey, SectionLabel } from '../ui/kit'
import { Slider } from '../ui/Slider'
import { useToast } from '../ui/Toast'
import { AiSettings } from './AiSettings'
import { BackupSettings } from './BackupSettings'
import { AdvancedSettings } from './AdvancedSettings'

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[14px] text-paper-dim">{label}</span>
      {children}
      {hint ? <span className="text-[12px] text-paper-dim/80">{hint}</span> : null}
    </label>
  )
}

export const inputCls = 'h-12 rounded-lg bg-walnut-2 px-3 text-[16px] text-paper outline-none placeholder:text-paper-dim/60 focus-visible:ring-2 focus-visible:ring-mustard'

function SyncSettings() {
  const s = useSettings()
  const toast = useToast()
  const [repo, setRepo] = useState(s.dataRepo)
  const [token, setToken] = useState(s.dataToken)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setRepo(s.dataRepo)
    setToken(s.dataToken)
  }, [s.dataRepo, s.dataToken])

  const test = async () => {
    setBusy(true)
    const r = await testConnection(repo, token)
    setResult(r)
    if (r.ok) {
      await setSettings({ dataRepo: repo.trim(), dataToken: token.trim(), lastSyncEtag: null })
      toast(await runSync({ force: true }))
    }
    setBusy(false)
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="s-sync">
      <SectionLabel>
        <span id="s-sync">🔵 {S.settings.sync}</span>
      </SectionLabel>
      <Field label={S.settings.syncRepo} hint="Your private repo, e.g. nico/setlab-data">
        <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="your-username/setlab-data" autoCapitalize="off" autoCorrect="off" className={inputCls} data-testid="sync-repo" />
      </Field>
      <Field label={S.settings.syncToken} hint="Token B: fine-grained, only setlab-data, Contents read-only. Stored on this phone only.">
        <input value={token} onChange={(e) => setToken(e.target.value)} type="password" autoComplete="off" placeholder="github_pat_…" className={inputCls} data-testid="sync-token" />
      </Field>
      <PianoKey tone="mustard" onClick={test} disabled={busy || !validRepo(repo) || !token} data-testid="sync-test">
        {busy ? 'Testing…' : S.settings.test}
      </PianoKey>
      {result ? (
        <p role="status" className={cx('rounded-lg px-3 py-2 text-[14px]', result.ok ? 'bg-olive/30 text-paper' : 'bg-rust/30 text-paper')}>
          {result.ok ? '✓ ' : '✕ '}
          {result.message}
        </p>
      ) : null}
    </section>
  )
}

function MixSettings() {
  const s = useSettings()
  return (
    <section className="flex flex-col gap-3" aria-labelledby="s-mix">
      <SectionLabel>
        <span id="s-mix">🎚️ {S.settings.mix}</span>
      </SectionLabel>
      <Slider label={S.settings.overlap} value={s.overlapSec} min={0} max={180} step={5} onChange={(v) => setSetting('overlapSec', v)} format={(v) => `${v} s`} />
      <Slider label={S.settings.maxPitch} value={s.maxPitchPct} min={2} max={16} step={0.5} onChange={(v) => setSetting('maxPitchPct', v)} format={(v) => `${v}%`} />
      <Slider label={S.settings.recentDays} value={s.recentDays} min={0} max={60} onChange={(v) => setSetting('recentDays', v)} format={(v) => `${v} d`} />
      <div className="flex flex-wrap gap-2">
        <Chip active={s.keylock} onClick={() => setSetting('keylock', !s.keylock)}>
          {s.keylock ? '✓ ' : ''}
          {S.settings.keylock}
        </Chip>
        <Chip active={s.clickSounds} onClick={() => setSetting('clickSounds', !s.clickSounds)}>
          {s.clickSounds ? '✓ ' : ''}
          {S.settings.sounds}
        </Chip>
      </div>
    </section>
  )
}

export function SettingsSheet() {
  const app = useApp()
  const s = useSettings()
  return (
    <Sheet open={app.settingsOpen} onClose={() => app.setSettingsOpen(false)} title={S.titles.settings} full testId="settings-sheet">
      <div className="flex flex-col gap-8 pb-8">
        <SyncSettings />
        <AiSettings />
        <MixSettings />
        <section className="flex flex-col gap-2">
          <SectionLabel>🧪 {S.settings.demo}</SectionLabel>
          <div className="flex gap-2">
            {(['auto', 'on', 'off'] as const).map((m) => (
              <Chip key={m} active={s.demoMode === m} onClick={() => setSetting('demoMode', m)}>
                {m === 'auto' ? S.settings.demoAuto : m === 'on' ? S.settings.demoOn : S.settings.demoOff}
              </Chip>
            ))}
          </div>
          <p className="text-[12px] text-paper-dim">Auto: demo tracks only until your first sync.</p>
        </section>
        <BackupSettings />
        <AdvancedSettings />
        <section className="flex flex-col gap-1 text-[13px] text-paper-dim">
          <SectionLabel>{S.settings.about}</SectionLabel>
          <p>
            {APP_NAME} · v{__APP_VERSION__} · everything stays on this phone except library sync and AI calls.
          </p>
        </section>
      </div>
    </Sheet>
  )
}
