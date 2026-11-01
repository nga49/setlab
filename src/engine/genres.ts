/**
 * Genre model (docs/ENGINE.md §3, docs/DATA.md §5). Editable in Settings: the app
 * passes a customised table; defaults below.
 */

export interface GenreFamily {
  id: string
  label: string
  genres: string[]
  /** Open-format families blend with anything at 0.5. */
  open?: boolean
}

export interface GenreTable {
  families: GenreFamily[]
  /** Undirected bridge links between genres of different families. */
  bridges: [string, string][]
  /** lowercase alias → canonical label */
  aliases: Record<string, string>
}

export const DEFAULT_GENRE_TABLE: GenreTable = {
  families: [
    {
      id: 'house',
      label: 'House',
      genres: [
        'House',
        'Deep House',
        'Tech House',
        'Bass House',
        'Afro House',
        'Organic House / Downtempo',
        'Progressive House',
        'Nu Disco / Disco',
        'Indie Dance',
        'Minimal / Deep Tech',
      ],
    },
    {
      id: 'techno',
      label: 'Techno',
      genres: ['Techno (Peak Time / Driving)', 'Techno (Raw / Deep / Hypnotic)', 'Hard Techno', 'Melodic House & Techno'],
    },
    { id: 'bass', label: 'Bass', genres: ['Drum & Bass', 'Dubstep', 'Breaks / Breakbeat'] },
    { id: 'amapiano', label: 'Amapiano', genres: ['Amapiano'] },
    { id: 'trance', label: 'Trance', genres: ['Trance (Main Floor)'] },
    {
      id: 'open',
      label: 'Open format',
      open: true,
      genres: ['Pop', 'Hip-Hop', 'R&B', 'Dance / EDM', 'Latin', 'Reggaeton', 'Funk / Soul', '2000s', '90s', 'Rock'],
    },
  ],
  bridges: [
    ['Melodic House & Techno', 'Progressive House'],
    ['Progressive House', 'Deep House'],
    ['Tech House', 'Minimal / Deep Tech'],
    ['Minimal / Deep Tech', 'Techno (Raw / Deep / Hypnotic)'],
    ['Afro House', 'Organic House / Downtempo'],
    ['Organic House / Downtempo', 'Amapiano'],
  ],
  aliases: {
    house: 'House',
    'deep house': 'Deep House',
    deephouse: 'Deep House',
    'tech house': 'Tech House',
    techhouse: 'Tech House',
    'bass house': 'Bass House',
    'afro house': 'Afro House',
    afrohouse: 'Afro House',
    'afro tech': 'Afro House',
    'organic house': 'Organic House / Downtempo',
    'organic house / downtempo': 'Organic House / Downtempo',
    downtempo: 'Organic House / Downtempo',
    'progressive house': 'Progressive House',
    progressive: 'Progressive House',
    'nu disco': 'Nu Disco / Disco',
    'nu-disco': 'Nu Disco / Disco',
    'nu disco / disco': 'Nu Disco / Disco',
    disco: 'Nu Disco / Disco',
    'indie dance': 'Indie Dance',
    'indie dance / nu disco': 'Indie Dance',
    minimal: 'Minimal / Deep Tech',
    'deep tech': 'Minimal / Deep Tech',
    'minimal / deep tech': 'Minimal / Deep Tech',
    techno: 'Techno (Peak Time / Driving)',
    'peak time techno': 'Techno (Peak Time / Driving)',
    'driving techno': 'Techno (Peak Time / Driving)',
    'techno (peak time / driving)': 'Techno (Peak Time / Driving)',
    'raw techno': 'Techno (Raw / Deep / Hypnotic)',
    'deep techno': 'Techno (Raw / Deep / Hypnotic)',
    'hypnotic techno': 'Techno (Raw / Deep / Hypnotic)',
    'techno (raw / deep / hypnotic)': 'Techno (Raw / Deep / Hypnotic)',
    'hard techno': 'Hard Techno',
    'melodic techno': 'Melodic House & Techno',
    'melodic house': 'Melodic House & Techno',
    'melodic house & techno': 'Melodic House & Techno',
    'melodic house and techno': 'Melodic House & Techno',
    'drum & bass': 'Drum & Bass',
    'drum and bass': 'Drum & Bass',
    'drum n bass': 'Drum & Bass',
    dnb: 'Drum & Bass',
    'd&b': 'Drum & Bass',
    dubstep: 'Dubstep',
    breaks: 'Breaks / Breakbeat',
    breakbeat: 'Breaks / Breakbeat',
    'breaks / breakbeat': 'Breaks / Breakbeat',
    amapiano: 'Amapiano',
    trance: 'Trance (Main Floor)',
    'trance (main floor)': 'Trance (Main Floor)',
    pop: 'Pop',
    'hip-hop': 'Hip-Hop',
    'hip hop': 'Hip-Hop',
    hiphop: 'Hip-Hop',
    rap: 'Hip-Hop',
    'r&b': 'R&B',
    rnb: 'R&B',
    'r and b': 'R&B',
    'dance / edm': 'Dance / EDM',
    'dance/edm': 'Dance / EDM',
    edm: 'Dance / EDM',
    dance: 'Dance / EDM',
    'electro house': 'Dance / EDM',
    latin: 'Latin',
    reggaeton: 'Reggaeton',
    funk: 'Funk / Soul',
    soul: 'Funk / Soul',
    'funk / soul': 'Funk / Soul',
    '2000s': '2000s',
    '00s': '2000s',
    '90s': '90s',
    rock: 'Rock',
  },
}

/** Typical BPM range per genre (DATA.md §5; open-format ranges are approximate defaults). */
export const GENRE_BPM: Record<string, [number, number]> = {
  'Afro House': [120, 126],
  Amapiano: [108, 116],
  'Bass House': [124, 130],
  'Breaks / Breakbeat': [125, 140],
  'Deep House': [118, 124],
  'Drum & Bass': [170, 180],
  Dubstep: [140, 150],
  'Hard Techno': [140, 160],
  House: [120, 126],
  'Indie Dance': [115, 124],
  'Melodic House & Techno': [120, 124],
  'Minimal / Deep Tech': [124, 130],
  'Nu Disco / Disco': [110, 122],
  'Organic House / Downtempo': [110, 120],
  'Progressive House': [124, 128],
  'Tech House': [122, 128],
  'Techno (Peak Time / Driving)': [128, 138],
  'Techno (Raw / Deep / Hypnotic)': [120, 138],
  'Trance (Main Floor)': [132, 140],
  Pop: [100, 128],
  'Hip-Hop': [85, 100],
  'R&B': [85, 105],
  'Dance / EDM': [124, 130],
  Latin: [90, 110],
  Reggaeton: [88, 100],
  'Funk / Soul': [100, 120],
  '2000s': [100, 130],
  '90s': [95, 130],
  Rock: [100, 140],
}

/** The 19 genres of the "Trending on Beatport" dropdown (DATA.md §5). */
export const BEATPORT_GENRES: string[] = [
  'Afro House',
  'Amapiano',
  'Bass House',
  'Breaks / Breakbeat',
  'Deep House',
  'Drum & Bass',
  'Dubstep',
  'Hard Techno',
  'House',
  'Indie Dance',
  'Melodic House & Techno',
  'Minimal / Deep Tech',
  'Nu Disco / Disco',
  'Organic House / Downtempo',
  'Progressive House',
  'Tech House',
  'Techno (Peak Time / Driving)',
  'Techno (Raw / Deep / Hypnotic)',
  'Trance (Main Floor)',
]

// ---------------------------------------------------------------------------

interface Compiled {
  familyOf: Map<string, GenreFamily>
  canonical: Map<string, string> // lowercase → canonical
  bridges: Set<string>
}
const compiled = new WeakMap<GenreTable, Compiled>()

function compile(t: GenreTable): Compiled {
  let c = compiled.get(t)
  if (c) return c
  const familyOf = new Map<string, GenreFamily>()
  const canonical = new Map<string, string>()
  for (const f of t.families) {
    for (const g of f.genres) {
      familyOf.set(g, f)
      canonical.set(g.toLowerCase(), g)
    }
  }
  for (const [alias, g] of Object.entries(t.aliases)) canonical.set(alias.toLowerCase(), g)
  const bridges = new Set<string>()
  for (const [a, b] of t.bridges) {
    bridges.add(`${a}|${b}`)
    bridges.add(`${b}|${a}`)
  }
  c = { familyOf, canonical, bridges }
  compiled.set(t, c)
  return c
}

/**
 * Map a free-text rekordbox genre to a canonical label (case-insensitive aliases).
 * Unknown genres are kept as-is (trimmed) and belong to family "other".
 */
export function normalizeGenre(raw: string | null | undefined, table: GenreTable = DEFAULT_GENRE_TABLE): string | null {
  if (raw == null) return null
  const s = raw.trim().replace(/\s+/g, ' ')
  if (!s) return null
  const c = compile(table)
  const key = s.toLowerCase()
  const hit = c.canonical.get(key) ?? c.canonical.get(key.replace(/\s*&\s*/g, ' & ')) ?? c.canonical.get(key.replace(/\s*\/\s*/g, ' / '))
  return hit ?? s
}

export function familyOf(genre: string | null | undefined, table: GenreTable = DEFAULT_GENRE_TABLE): string {
  if (!genre) return 'unknown'
  return compile(table).familyOf.get(genre)?.id ?? 'other'
}

export function isOpenFormat(genre: string | null | undefined, table: GenreTable = DEFAULT_GENRE_TABLE): boolean {
  if (!genre) return false
  return !!compile(table).familyOf.get(genre)?.open
}

export type GenreLink = 'same' | 'family' | 'bridge' | 'open' | 'jump' | 'unknown'

/** How two genres relate, with the score from ENGINE.md §3. */
export function genreRelation(
  a: string | null | undefined,
  b: string | null | undefined,
  table: GenreTable = DEFAULT_GENRE_TABLE,
): { link: GenreLink; score: number } {
  if (!a || !b) return { link: 'unknown', score: 0.5 }
  if (a === b) return { link: 'same', score: 1.0 }
  const c = compile(table)
  const fa = c.familyOf.get(a)
  const fb = c.familyOf.get(b)
  // Unrecognised genres cannot be judged: treat like unknown.
  if (!fa || !fb) return { link: 'unknown', score: 0.5 }
  if (fa === fb) return { link: 'family', score: 0.75 }
  if (c.bridges.has(`${a}|${b}`)) return { link: 'bridge', score: 0.6 }
  if (fa.open || fb.open) return { link: 'open', score: 0.5 }
  return { link: 'jump', score: 0.2 }
}

export function genreScore(a: string | null | undefined, b: string | null | undefined, table?: GenreTable): number {
  return genreRelation(a, b, table).score
}

export const GENRE_LINK_TEXT: Record<GenreLink, string> = {
  same: 'same genre',
  family: 'same family',
  bridge: 'genre bridge',
  open: 'open format',
  jump: 'genre jump',
  unknown: 'genre ?',
}

export function allGenres(table: GenreTable = DEFAULT_GENRE_TABLE): string[] {
  return table.families.flatMap((f) => f.genres)
}
