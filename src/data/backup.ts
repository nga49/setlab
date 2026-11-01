import { APP_SLUG, BACKUP_SCHEMA } from '../config'
import { BACKUP_TABLES, db, nowIso, type BackupTable } from '../db/db'
import type { StoredTrack } from '../db/types'
import { SECRET_KEYS } from '../db/settings'

/**
 * Backup format (docs/DATA.md §7): { app, schema, exportedAt, tables }. All tables except
 * synced tracks; wishlist (quick-add) tracks are added as `localTracks` because they live
 * only on the phone. API keys and tokens are excluded unless asked for.
 */
export interface Backup {
  app: string
  schema: number
  exportedAt: string
  tables: Partial<Record<BackupTable, unknown[]>> & { localTracks?: StoredTrack[] }
  includesSecrets: boolean
}

export async function exportBackup(includeSecrets = false): Promise<Backup> {
  const tables: Backup['tables'] = {}
  for (const name of BACKUP_TABLES) {
    let rows = await db.table(name).toArray()
    if (name === 'settings' && !includeSecrets) rows = rows.filter((r: { key: string }) => !SECRET_KEYS.includes(r.key as never))
    tables[name] = rows
  }
  tables.localTracks = await db.tracks.where('source').equals('local').toArray()
  return { app: APP_SLUG, schema: BACKUP_SCHEMA, exportedAt: nowIso(), tables, includesSecrets: includeSecrets }
}

export class BackupError extends Error {}

/** Merge a backup into this device (upsert). Secrets missing from the file are left as they are. */
export async function importBackup(json: unknown): Promise<{ rows: number }> {
  const b = json as Partial<Backup>
  if (!b || b.app !== APP_SLUG || typeof b.tables !== 'object' || b.tables === null) throw new BackupError(`This is not a ${APP_SLUG} backup file.`)
  if (typeof b.schema !== 'number' || b.schema > BACKUP_SCHEMA) throw new BackupError('This backup comes from a newer version of the app: update first.')
  let rows = 0
  await db.transaction('rw', [...BACKUP_TABLES.map((t) => db.table(t)), db.tracks], async () => {
    for (const name of BACKUP_TABLES) {
      const list = b.tables![name]
      if (!Array.isArray(list)) continue
      await db.table(name).bulkPut(list)
      rows += list.length
    }
    const local = b.tables!.localTracks
    if (Array.isArray(local)) {
      await db.tracks.bulkPut(local.filter((t) => t && t.source === 'local'))
      rows += local.length
    }
  })
  return { rows }
}

/** Erase everything on this device (tracks, sets, history, settings, keys). */
export async function resetApp(): Promise<void> {
  await db.delete()
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(`${APP_SLUG}.`)) localStorage.removeItem(k)
  } catch {
    /* ignore */
  }
}
