/**
 * Single place for the app identity. Rename the app by changing APP_NAME only.
 * Used by: header, PWA manifest, page title, icon text, backup files.
 */
export const APP_NAME = 'SETLAB'
export const APP_SLUG = 'setlab'
export const APP_DESCRIPTION = 'Personal DJ set organizer: harmonic mixing, BPM flow and energy arcs.'
export const THEME_COLOR = '#2B1D14'

/** Library sync defaults (see docs/SYNC.md). */
export const DATA_REPO_DEFAULT_NAME = 'setlab-data'
export const TRACKS_PATH = 'tracks.json'
/** Re-fetch tracks.json on app open when the last fetch is older than this. */
export const SYNC_STALE_MS = 30 * 60 * 1000

/** Backup file format version (see docs/DATA.md §7). */
export const BACKUP_SCHEMA = 1
