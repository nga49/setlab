import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { TitleFont } from '../ui/titleFont'

/** Every setting with its default. Tokens and keys live here, on the device only. */
export interface Settings {
  // Library sync (docs/SYNC.md §4)
  dataRepo: string // "owner/setlab-data"
  dataToken: string
  lastSyncAt: string | null
  lastSyncEtag: string | null
  lastSyncReport: string | null
  lastSyncError: string | null
  lastSyncCount: number | null
  lastSyncGeneratedAt: string | null

  // AI (docs/AI.md)
  aiKey: string
  aiFastModel: string
  aiMainModel: string
  aiBudgetEur: number
  eurPerUsd: number

  // Spotify (optional)
  spotifyClientId: string
  spotifyToken: string
  spotifyRefresh: string
  spotifyExpiresAt: number

  // Mix defaults
  overlapSec: number
  maxPitchPct: number
  keylock: boolean
  recentDays: number

  // UI
  demoMode: 'auto' | 'on' | 'off'
  clickSounds: boolean
  installHintDismissed: boolean
  gigMode: boolean
  /** Title font picked on this phone (null = built-in). Never leaves the device except in backups. */
  titleFont: TitleFont | null

  // Advanced editors (null = use built-in defaults)
  partyPresets: unknown | null
  genreFamilies: unknown | null
}

export const DEFAULT_SETTINGS: Settings = {
  dataRepo: '',
  dataToken: '',
  lastSyncAt: null,
  lastSyncEtag: null,
  lastSyncReport: null,
  lastSyncError: null,
  lastSyncCount: null,
  lastSyncGeneratedAt: null,

  aiKey: '',
  aiFastModel: '',
  aiMainModel: '',
  aiBudgetEur: 5,
  eurPerUsd: 0.92,

  spotifyClientId: '',
  spotifyToken: '',
  spotifyRefresh: '',
  spotifyExpiresAt: 0,

  overlapSec: 60,
  maxPitchPct: 6,
  keylock: true,
  recentDays: 14,

  demoMode: 'auto',
  clickSounds: false,
  installHintDismissed: false,
  gigMode: false,
  titleFont: null,

  partyPresets: null,
  genreFamilies: null,
}

/** Keys that are secrets: excluded from backups unless explicitly included. */
export const SECRET_KEYS: (keyof Settings)[] = ['dataToken', 'aiKey', 'spotifyToken', 'spotifyRefresh']

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray()
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) out[r.key] = r.value
  return out as unknown as Settings
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value })
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value })))
}

/** Live settings for React. Returns defaults while loading. */
export function useSettings(): Settings {
  const s = useLiveQuery(getSettings, [], DEFAULT_SETTINGS)
  return s ?? DEFAULT_SETTINGS
}
