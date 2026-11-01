import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/db'
import { getSettings, setSettings } from '../src/db/settings'
import { BackupError, exportBackup, importBackup, resetApp } from '../src/data/backup'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

async function seed() {
  await setSettings({ aiKey: 'secret-key', dataToken: 'secret-token', dataRepo: 'nico/setlab-data', overlapSec: 45 })
  await db.sets.put({ id: 's1', name: 'Set', mode: 'journey', arc: 'full', trackIds: ['rb:1'], items: [], locks: [], createdAt: 'x', updatedAt: 'x' })
  await db.ratings.put({ key: 'rb:1>rb:2', fromId: 'rb:1', toId: 'rb:2', rating: 1, date: 'x' })
  await db.tracks.bulkPut([
    { id: 'rb:1', artist: 'a', title: 'b', remix: null, genre: null, bpm: null, camelot: null, lengthSec: null, year: null, source: 'rekordbox', status: 'active' },
    { id: 'local:w', artist: 'Demo Artist 99', title: 'Wish', remix: null, genre: null, bpm: null, camelot: null, lengthSec: null, year: null, source: 'local', status: 'wishlist' },
  ])
}

describe('backup (DATA.md §7)', () => {
  it('exports every table except synced tracks; secrets excluded by default', async () => {
    await seed()
    const b = await exportBackup()
    expect(b).toMatchObject({ app: 'setlab', schema: 1, includesSecrets: false })
    expect(b.tables.sets).toHaveLength(1)
    expect(b.tables.ratings).toHaveLength(1)
    expect(b.tables.localTracks!.map((t) => t.id)).toEqual(['local:w'])
    const keys = (b.tables.settings as { key: string }[]).map((r) => r.key)
    expect(keys).toContain('dataRepo')
    expect(keys).not.toContain('aiKey')
    expect(keys).not.toContain('dataToken')
    expect(JSON.stringify(b)).not.toContain('secret-')
    const withSecrets = await exportBackup(true)
    expect(JSON.stringify(withSecrets)).toContain('secret-key')
  })

  it('imports into a fresh device and keeps local secrets', async () => {
    await seed()
    const b = JSON.parse(JSON.stringify(await exportBackup()))
    await db.delete()
    await db.open()
    await setSettings({ aiKey: 'new-phone-key' })
    const r = await importBackup(b)
    expect(r.rows).toBeGreaterThan(3)
    expect(await db.sets.get('s1')).toBeDefined()
    expect(await db.tracks.get('local:w')).toBeDefined()
    expect(await db.tracks.get('rb:1')).toBeUndefined()
    const s = await getSettings()
    expect(s.overlapSec).toBe(45)
    expect(s.aiKey).toBe('new-phone-key')
  })

  it('rejects foreign or newer files', async () => {
    await expect(importBackup({ app: 'other', schema: 1, tables: {} })).rejects.toBeInstanceOf(BackupError)
    await expect(importBackup({ app: 'setlab', schema: 99, tables: {} })).rejects.toThrow(/newer version/)
    await expect(importBackup(null)).rejects.toBeInstanceOf(BackupError)
  })

  it('reset erases everything', async () => {
    await seed()
    localStorage.setItem('setlab.nowPlaying', 'rb:1')
    await resetApp()
    await db.open()
    expect(await db.sets.count()).toBe(0)
    expect(localStorage.getItem('setlab.nowPlaying')).toBeNull()
  })
})
