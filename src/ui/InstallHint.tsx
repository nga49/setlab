import { useEffect, useState } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { APP_NAME } from '../config'
import { setSetting, useSettings } from '../db/settings'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** Install hint on first mobile visit: native prompt on Android/Chrome, Share › Add to Home Screen on iOS. */
export function InstallHint() {
  const s = useSettings()
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault()
      setEvt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', on)
    return () => window.removeEventListener('beforeinstallprompt', on)
  }, [])
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (s.installHintDismissed || isStandalone() || (!mobile && !evt)) return null
  const dismiss = () => setSetting('installHintDismissed', true)
  return (
    <div className="mx-4 mb-2 flex items-center gap-3 rounded-2xl bg-teal p-3 text-paper" role="region" aria-label="Install the app" data-testid="install-hint">
      <img src="icons/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
      <p className="min-w-0 flex-1 text-[14px]">
        {evt ? `Install ${APP_NAME} on your home screen: it works offline.` : ios ? 'Install: tap Share, then Add to Home Screen. Works offline.' : `Install ${APP_NAME} from the browser menu: it works offline.`}
      </p>
      {evt ? (
        <button
          type="button"
          onClick={async () => {
            await evt.prompt()
            await evt.userChoice
            setEvt(null)
            dismiss()
          }}
          className="piano-key min-h-12 rounded-xl bg-mustard px-3 font-mono text-[13px] font-bold text-ink"
        >
          Install
        </button>
      ) : null}
      <button type="button" onClick={dismiss} aria-label="Dismiss install hint" className="flex h-12 w-10 items-center justify-center">
        <XIcon size={20} />
      </button>
    </div>
  )
}
