import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './styles/index.css'
import App from './App'
import { AppStateProvider } from './state/app'
import { ToastProvider } from './ui/Toast'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // autoUpdate: a new version activates on the next load; the app shell keeps working offline.
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </ToastProvider>
  </StrictMode>,
)
