import { useEffect } from 'react'
import { BooksIcon, CassetteTapeIcon, GearSixIcon, NotePencilIcon, PlayIcon } from '@phosphor-icons/react'
import { APP_NAME } from './config'
import { S } from './strings'
import { TABS, type TabId, useApp } from './state/app'
import { useLibrary } from './data/LibraryProvider'
import { useSettings } from './db/settings'
import { cx } from './ui/kit'
import { SetsTab } from './tabs/SetsTab'
import { LiveTab } from './tabs/LiveTab'
import { LibraryTab } from './tabs/LibraryTab'
import { PracticeTab } from './tabs/PracticeTab'
import { SettingsSheet } from './settings/SettingsSheet'
import { WheelButton } from './wheel/WheelButton'
// Imported eagerly: the wheel must open in under 150 ms (docs/PRODUCT.md).
import WheelOverlay from './wheel/WheelOverlay'

const TAB_ICONS: Record<TabId, typeof PlayIcon> = {
  sets: CassetteTapeIcon,
  live: PlayIcon,
  library: BooksIcon,
  practice: NotePencilIcon,
}

export default function App() {
  const app = useApp()
  const { demo } = useLibrary()
  const settings = useSettings()
  const gig = app.tab === 'live' && settings.gigMode

  useEffect(() => {
    document.title = `${APP_NAME} · ${S.titles[app.tab]}`
  }, [app.tab])

  return (
    <div className={cx('wood-grain flex h-full flex-col', gig && 'gig bg-walnut')}>
      <header className="safe-top flex shrink-0 items-center justify-between gap-3 px-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-title text-[19px] leading-none text-mustard" data-testid="app-name">
            {APP_NAME}
          </span>
          {demo ? (
            <span
              className="rounded-[4px] border border-mustard/70 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-[0.12em] text-mustard"
              title={S.demoHint}
              data-testid="demo-badge"
            >
              {S.demoBadge}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => app.setSettingsOpen(true)}
          aria-label={S.openSettings}
          className="piano-key flex h-12 w-12 items-center justify-center rounded-full bg-walnut-2 text-paper shadow-[inset_0_-3px_0_#1E140E]"
          data-testid="open-settings"
        >
          <GearSixIcon size={24} weight="duotone" />
        </button>
      </header>

      <main className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-contain" id="main">
        <div className="mx-auto w-full max-w-[720px] px-4 pb-40">
          {app.tab === 'sets' && <SetsTab />}
          {app.tab === 'live' && <LiveTab />}
          {app.tab === 'library' && <LibraryTab />}
          {app.tab === 'practice' && <PracticeTab />}
        </div>
      </main>

      <WheelButton />

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-walnut-3 bg-walnut-deep/95"
        aria-label="Main"
      >
        <ul className="mx-auto flex max-w-[720px] justify-around">
          {TABS.map((t) => {
            const Icon = TAB_ICONS[t]
            const active = app.tab === t
            return (
              <li key={t} className="flex-1">
                <button
                  type="button"
                  onClick={() => app.go(t)}
                  aria-current={active ? 'page' : undefined}
                  data-testid={`tab-${t}`}
                  className={cx(
                    'piano-key flex min-h-[64px] w-full flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em]',
                    active ? 'text-mustard' : 'text-paper-dim',
                  )}
                >
                  <Icon size={26} weight={active ? 'fill' : 'regular'} aria-hidden />
                  {S.tabs[t]}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <SettingsSheet />
      {app.wheelOpen ? <WheelOverlay /> : null}
    </div>
  )
}
