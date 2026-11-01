import { createContext, type ReactNode, useContext, useMemo, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useSettings } from '../db/settings'
import type { Estimate, Override, Rating, Session } from '../db/types'
import { DEMO_TRACKS } from '../demo/demoTracks'
import { DEFAULT_GENRE_TABLE, type GenreTable } from '../engine/genres'
import { LibraryGraph } from '../engine/graph'
import { buildRatingsIndex } from '../engine/score'
import type { ScoreContext } from '../engine/types'
import { isDemoActive } from './library'
import { type LibTrack, toLibTrack } from './effective'

export interface Library {
  /** Every visible track (owned + wishlist), effective values. */
  tracks: LibTrack[]
  /** Owned tracks (status active): what the engine may play. */
  owned: LibTrack[]
  byId: Map<string, LibTrack>
  demo: boolean
  loading: boolean
  syncedCount: number
  ctx: ScoreContext
  genres: GenreTable
  /** Graph over owned tracks, built lazily and cached until the library changes. */
  graph: () => LibraryGraph
  overlapSec: number
}

const Ctx = createContext<Library | null>(null)

function recentIds(sessions: Session[], days: number): Set<string> {
  const since = Date.now() - days * 86400_000
  const out = new Set<string>()
  for (const s of sessions) for (const p of s.plays) if (Date.parse(p.at) >= since) out.add(p.trackId)
  return out
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const settings = useSettings()
  const stored = useLiveQuery(() => db.tracks.where('status').anyOf('active', 'wishlist').toArray(), [])
  const overrides = useLiveQuery(() => db.overrides.toArray(), [], [] as Override[])
  const estimates = useLiveQuery(() => db.estimates.toArray(), [], [] as Estimate[])
  const ratings = useLiveQuery(() => db.ratings.toArray(), [], [] as Rating[])
  const sessions = useLiveQuery(
    () => db.sessions.where('start').above(new Date(Date.now() - 60 * 86400_000).toISOString()).toArray(),
    [],
    [] as Session[],
  )
  const genres = (settings.genreFamilies as GenreTable | null) ?? DEFAULT_GENRE_TABLE

  const loading = stored === undefined
  const syncedCount = stored?.filter((t) => t.source === 'rekordbox').length ?? 0
  const demo = !loading && isDemoActive(settings, syncedCount)

  const tracks = useMemo(() => {
    const list = [...(demo ? DEMO_TRACKS : []), ...(stored ?? [])]
    const ov = new Map(overrides.map((o) => [o.trackId, o]))
    const es = new Map(estimates.map((e) => [e.trackId, e]))
    return list.map((t) => toLibTrack(t, ov.get(t.id), es.get(t.id), genres))
  }, [stored, overrides, estimates, demo, genres])

  const ctx = useMemo<ScoreContext>(
    () => ({
      maxPitchPct: settings.maxPitchPct,
      keylock: settings.keylock,
      genres,
      ratings: buildRatingsIndex(ratings),
      recent: recentIds(sessions, settings.recentDays),
    }),
    [settings.maxPitchPct, settings.keylock, settings.recentDays, genres, ratings, sessions],
  )

  const graphRef = useRef<{ key: unknown; ctx: unknown; g: LibraryGraph } | null>(null)
  const value = useMemo<Library>(() => {
    const owned = tracks.filter((t) => t.status === 'active')
    return {
      tracks,
      owned,
      byId: new Map(tracks.map((t) => [t.id, t])),
      demo,
      loading,
      syncedCount,
      ctx,
      genres,
      overlapSec: settings.overlapSec,
      graph: () => {
        const cur = graphRef.current
        if (cur && cur.key === owned && cur.ctx === ctx) return cur.g
        const g = new LibraryGraph(owned, ctx, settings.overlapSec)
        graphRef.current = { key: owned, ctx, g }
        return g
      },
    }
  }, [tracks, demo, loading, syncedCount, ctx, genres, settings.overlapSec])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLibrary(): Library {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLibrary outside LibraryProvider')
  return v
}
