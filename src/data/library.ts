import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { StoredTrack } from '../db/types'
import { DEMO_TRACKS } from '../demo/demoTracks'
import { type Settings, useSettings } from '../db/settings'

/** Demo mode is on when forced, or automatic with no synced tracks yet. */
export function isDemoActive(settings: Pick<Settings, 'demoMode'>, syncedCount: number): boolean {
  if (settings.demoMode === 'on') return true
  if (settings.demoMode === 'off') return false
  return syncedCount === 0
}

export interface RawLibrary {
  /** Visible tracks: synced + wishlist (and demo tracks when demo mode is on). */
  tracks: StoredTrack[]
  syncedCount: number
  demo: boolean
  loading: boolean
}

/** Raw stored tracks for the UI. Effective values (overrides, estimates) are merged in effective.ts. */
export function useRawLibrary(): RawLibrary {
  const settings = useSettings()
  const stored = useLiveQuery(() => db.tracks.where('status').anyOf('active', 'wishlist').toArray(), [])
  const loading = stored === undefined
  const list = stored ?? []
  const syncedCount = list.filter((t) => t.source === 'rekordbox').length
  const demo = !loading && isDemoActive(settings, syncedCount)
  const tracks = demo ? [...DEMO_TRACKS, ...list] : list
  return { tracks, syncedCount, demo, loading }
}
