import { db, nowIso } from '../db/db'
import type { RatingValue } from '../db/types'
import { bpmBucket } from '../engine/bpm'
import { transitionScore } from '../engine/score'
import type { EngineTrack, ScoreContext } from '../engine/types'

/** Rate a played transition. Stores the key move + BPM bucket for pattern learning (ENGINE.md §5). */
export async function rateTransition(a: EngineTrack, b: EngineTrack, rating: RatingValue, ctx: ScoreContext, note?: string): Promise<void> {
  const t = transitionScore(a, b, { ...ctx, ratings: undefined })
  const key = `${a.id}>${b.id}`
  const prev = await db.ratings.get(key)
  await db.ratings.put({
    key,
    fromId: a.id,
    toId: b.id,
    rating,
    note: note ?? prev?.note,
    date: nowIso(),
    keyMove: t.keyMove,
    bpmBucket: bpmBucket(a.bpm, b.bpm),
  })
}

export async function clearRating(a: string, b: string): Promise<void> {
  await db.ratings.delete(`${a}>${b}`)
}

export const RATING_EMOJI: Record<RatingValue, string> = { [-1]: '👎', 0: '👌', 1: '🔥' }
