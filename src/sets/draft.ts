import type { SetResult } from '../engine/generate'
import type { PartyResult } from '../engine/parties'
import type { ArcId, Mode } from '../engine/types'
import type { PartyId } from '../engine/parties'
import { createStore } from '../state/store'

export interface OrganizerDraft {
  picked: string[]
  locks: string[]
  pinFirst: string | null
  pinLast: string | null
  arc: Exclude<ArcId, 'gentle'>
  /** null = use every picked track (reorder only). */
  durationMin: number | null
  poolMode: 'picked' | 'fill'
  seed: number
  results: SetResult[] | null
  generating: boolean
  focusMode: Mode
}

export const organizer = createStore<OrganizerDraft>({
  picked: [],
  locks: [],
  pinFirst: null,
  pinLast: null,
  arc: 'full',
  durationMin: 60,
  poolMode: 'fill',
  seed: 1,
  results: null,
  generating: false,
  focusMode: 'journey',
})

export interface PartyDraft {
  type: PartyId
  crowdAge: number
  era: [number, number]
  eraOn: boolean
  energy: number
  durationMin: number
  freeText: string
  seed: number
  result: PartyResult | null
  generating: boolean
}

export const party = createStore<PartyDraft>({
  type: 'wedding',
  crowdAge: 35,
  era: [1970, new Date().getFullYear()],
  eraOn: false,
  energy: 6,
  durationMin: 120,
  freeText: '',
  seed: 1,
  result: null,
  generating: false,
})

export interface EditorDraft {
  open: boolean
  setId: string | null
  name: string
  mode: Mode
  arc: ArcId
  trackIds: string[]
  locks: string[]
  pinFirst: string | null
  pinLast: string | null
  notes: string
  tags: string[]
  kind: 'organizer' | 'party'
  createdAt: string | null
}

export const editor = createStore<EditorDraft>({
  open: false,
  setId: null,
  name: '',
  mode: 'journey',
  arc: 'full',
  trackIds: [],
  locks: [],
  pinFirst: null,
  pinLast: null,
  notes: '',
  tags: [],
  kind: 'organizer',
  createdAt: null,
})

export const MODE_LABEL: Record<Mode, { label: string; emoji: string }> = {
  smooth: { label: 'Smooth', emoji: '🟢' },
  journey: { label: 'Journey', emoji: '🔥' },
  keytour: { label: 'Key tour', emoji: '🎨' },
}
