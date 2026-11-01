import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback } from 'react'
import { db, nowIso, uid } from '../db/db'
import type { Session } from '../db/types'
import type { EngineTrack } from '../engine/types'
import { useApp } from '../state/app'

/** A live session is reused until it is ended or idle for 4 hours. */
const SESSION_KEY = 'setlab.liveSession'
const IDLE_MS = 4 * 3600_000

function currentId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}
function setCurrentId(id: string | null) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export async function logPlay(track: EngineTrack): Promise<Session> {
  const now = nowIso()
  let s = currentId() ? await db.sessions.get(currentId()!) : undefined
  const last = s?.plays[s.plays.length - 1]?.at ?? s?.start
  if (!s || s.end || (last && Date.now() - Date.parse(last) > IDLE_MS)) {
    if (s && !s.end) await db.sessions.update(s.id, { end: last ?? now })
    s = { id: uid('live:'), kind: 'live', start: now, plays: [], snapshots: {} }
  }
  if (s.plays[s.plays.length - 1]?.trackId !== track.id) {
    s.plays = [...s.plays, { trackId: track.id, at: now }]
    s.snapshots = { ...s.snapshots, [track.id]: { artist: track.artist, title: track.title, camelot: track.camelot, bpm: track.bpm } }
  }
  await db.sessions.put(s)
  setCurrentId(s.id)
  return s
}

export function useLiveSession() {
  const app = useApp()
  const session = useLiveQuery(async () => {
    const id = currentId()
    const s = id ? await db.sessions.get(id) : undefined
    return s && !s.end ? s : null
  }, [app.nowPlayingId])

  const played = new Set(session?.plays.map((p) => p.trackId) ?? [])

  const play = useCallback(
    async (t: EngineTrack) => {
      app.setNowPlayingId(t.id)
      await logPlay(t)
    },
    [app],
  )

  /** ◀◀ undo: remove the last play and go back to the previous track. */
  const undo = useCallback(async () => {
    const id = currentId()
    const s = id ? await db.sessions.get(id) : undefined
    if (!s || !s.plays.length) return
    const plays = s.plays.slice(0, -1)
    await db.sessions.update(s.id, { plays })
    app.setNowPlayingId(plays[plays.length - 1]?.trackId ?? null)
  }, [app])

  /** ⏏ end the session (it stays in Practice history). */
  const end = useCallback(async () => {
    const id = currentId()
    if (id) await db.sessions.update(id, { end: nowIso() })
    setCurrentId(null)
    app.setNowPlayingId(null)
  }, [app])

  return { session: session ?? null, played, play, undo, end }
}
