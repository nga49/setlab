import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type TabId = 'sets' | 'live' | 'library' | 'practice'
export const TABS: TabId[] = ['sets', 'live', 'library', 'practice']

function readHash(): { tab: TabId; sub: string } {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [first, ...rest] = raw.split('/')
  const tab = (TABS as string[]).includes(first ?? '') ? (first as TabId) : 'sets'
  return { tab, sub: rest.join('/') }
}

interface AppState {
  tab: TabId
  sub: string
  go: (tab: TabId, sub?: string) => void
  wheelOpen: boolean
  wheelKey: string | null
  openWheel: (key?: string | null) => void
  closeWheel: () => void
  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void
  /** Library filter set from the wheel ("tap a key → filtered track list"). */
  libraryKeyFilter: string | null
  setLibraryKeyFilter: (k: string | null) => void
  nowPlayingId: string | null
  setNowPlayingId: (id: string | null) => void
}

const Ctx = createContext<AppState | null>(null)

const NOW_KEY = 'setlab.nowPlaying'

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [{ tab, sub }, setRoute] = useState(readHash)
  const [wheelOpen, setWheelOpen] = useState(false)
  const [wheelKey, setWheelKey] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [libraryKeyFilter, setLibraryKeyFilter] = useState<string | null>(null)
  const [nowPlayingId, setNowPlayingIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(NOW_KEY)
    } catch {
      return null
    }
  })

  useEffect(() => {
    const onHash = () => setRoute(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((t: TabId, s = '') => {
    const h = `#/${t}${s ? `/${s}` : ''}`
    if (window.location.hash !== h) window.location.hash = h
    setRoute({ tab: t, sub: s })
  }, [])

  const setNowPlayingId = useCallback((id: string | null) => {
    setNowPlayingIdState(id)
    try {
      if (id) localStorage.setItem(NOW_KEY, id)
      else localStorage.removeItem(NOW_KEY)
    } catch {
      /* private mode: keep in memory only */
    }
  }, [])

  const openWheel = useCallback((k: string | null = null) => {
    setWheelKey(k)
    setWheelOpen(true)
  }, [])
  const closeWheel = useCallback(() => setWheelOpen(false), [])

  const value = useMemo<AppState>(
    () => ({
      tab,
      sub,
      go,
      wheelOpen,
      wheelKey,
      openWheel,
      closeWheel,
      settingsOpen,
      setSettingsOpen,
      libraryKeyFilter,
      setLibraryKeyFilter,
      nowPlayingId,
      setNowPlayingId,
    }),
    [tab, sub, go, wheelOpen, wheelKey, openWheel, closeWheel, settingsOpen, libraryKeyFilter, nowPlayingId, setNowPlayingId],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside AppStateProvider')
  return v
}
