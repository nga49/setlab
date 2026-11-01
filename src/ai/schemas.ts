import { z } from 'zod'

/** Output contracts (docs/AI.md §2). Validated with zod; no free-text parsing. */

const confidence = z.enum(['high', 'medium', 'low'])

export const estimateSchema = z.object({
  bpm: z.number().nullable(),
  camelot: z.string().nullable(),
  keyName: z.string().nullable(),
  genre: z.string().nullable(),
  energy: z.number().nullable(),
  year: z.number().nullable(),
  confidence,
  note: z.string(),
})
export type EstimateOut = z.infer<typeof estimateSchema>

export const batchEstimateSchema = z.object({
  items: z.array(estimateSchema.extend({ index: z.number() })),
})

export const discoveredTrack = z.object({
  artist: z.string(),
  title: z.string(),
  remix: z.string().nullable(),
  year: z.number().nullable(),
  genre: z.string().nullable(),
  estBpm: z.number().nullable(),
  estCamelot: z.string().nullable(),
  energy: z.number().nullable(),
  why: z.string(),
  confidence: confidence.optional(),
})
export type DiscoveredTrack = z.infer<typeof discoveredTrack>

export const discoverySchema = z.object({
  tracks: z.array(discoveredTrack),
  chart: z.enum(['top100', 'hype', 'new']).nullable().optional(),
  trendNote: z.string().nullable().optional(),
})
export type DiscoveryOut = z.infer<typeof discoverySchema>

export const tipSchema = z.object({ tip: z.string() })

/** Text-mode JSON shapes, written into prompts for web-search calls. */
export const DISCOVERY_JSON_SHAPE =
  '{"tracks":[{"artist":string,"title":string,"remix":string|null,"year":number|null,"genre":string|null,"estBpm":number|null,"estCamelot":string|null,"energy":number|null,"why":string,"confidence":"high"|"medium"|"low"}],"chart":"top100"|"hype"|"new"|null,"trendNote":string|null}'
