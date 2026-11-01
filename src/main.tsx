import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './styles/index.css'
import App from './App'
import { AppStateProvider } from './state/app'
import { LibraryProvider } from './data/LibraryProvider'
import { ToastProvider } from './ui/Toast'

// Test hook for the e2e performance test only (?e2e=1): exposes the local database.
if (new URLSearchParams(location.search).has('e2e')) {
  void import('./db/db').then(({ db }) => ((window as unknown as { __setlab: unknown }).__setlab = { db }))
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // autoUpdate: a new version activates on the next load; the app shell keeps working offline.
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AppStateProvider>
        <LibraryProvider>
          <App />
        </LibraryProvider>
      </AppStateProvider>
    </ToastProvider>
  </StrictMode>,
)
