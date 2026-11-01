import Dexie, { type Table } from 'dexie'
import type {
  AiCacheEntry,
  AiUsage,
  Estimate,
  MissingItem,
  Override,
  Rating,
  SavedSet,
  Session,
  SettingRow,
  StoredTrack,
} from './types'

/** On-device database. Personal data lives only here (docs/DATA.md §2). */
export class SetlabDB extends Dexie {
  tracks!: Table<StoredTrack, string>
  overrides!: Table<Override, string>
  estimates!: Table<Estimate, string>
  sets!: Table<SavedSet, string>
  sessions!: Table<Session, string>
  ratings!: Table<Rating, string>
  missing!: Table<MissingItem, string>
  aiCache!: Table<AiCacheEntry, string>
  aiUsage!: Table<AiUsage, string>
  settings!: Table<SettingRow, string>

  constructor(name = 'setlab') {
    super(name)
    this.version(1).stores({
      tracks: 'id, status, source',
      overrides: 'trackId',
      estimates: 'trackId',
      sets: 'id, updatedAt',
      sessions: 'id, start, kind',
      ratings: 'key, fromId, toId',
      missing: 'id, status, mode, savedAt',
      aiCache: 'hash, feature',
      aiUsage: 'month',
      settings: 'key',
    })
  }
}

export const db = new SetlabDB()

/** Tables included in backups (docs/DATA.md §7: all tables except tracks). */
export const BACKUP_TABLES = [
  'overrides',
  'estimates',
  'sets',
  'sessions',
  'ratings',
  'missing',
  'aiCache',
  'aiUsage',
  'settings',
] as const
export type BackupTable = (typeof BACKUP_TABLES)[number]

export function uid(prefix = ''): string {
  const c = globalThis.crypto
  const id =
    c && 'randomUUID' in c
      ? c.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return prefix + id
}

export const nowIso = () => new Date().toISOString()
