import type { StoredTrack } from '../db/types'

/**
 * Fictional demo library (docs/DATA.md §6). Every artist and title is invented
 * ("Demo Artist 07 · Demo Track K"). Values are generated deterministically so
 * tests and screenshots are stable. Not real music metadata.
 */

interface GenreSpec {
  genre: string
  count: number
  bpm: [number, number]
  years: [number, number]
  length: [number, number] // seconds
}

const SPECS: GenreSpec[] = [
  { genre: 'Tech House', count: 10, bpm: [123, 128], years: [2016, 2026], length: [330, 420] },
  { genre: 'Deep House', count: 7, bpm: [118, 124], years: [2012, 2026], length: [360, 450] },
  { genre: 'House', count: 7, bpm: [120, 126], years: [2008, 2026], length: [330, 420] },
  { genre: 'Afro House', count: 7, bpm: [120, 125], years: [2017, 2026], length: [360, 450] },
  { genre: 'Melodic House & Techno', count: 8, bpm: [120, 125], years: [2016, 2026], length: [380, 480] },
  { genre: 'Progressive House', count: 4, bpm: [124, 128], years: [2014, 2026], length: [380, 460] },
  { genre: 'Techno (Peak Time / Driving)', count: 6, bpm: [128, 136], years: [2015, 2026], length: [340, 420] },
  { genre: 'Techno (Raw / Deep / Hypnotic)', count: 4, bpm: [124, 134], years: [2014, 2026], length: [360, 450] },
  { genre: 'Hard Techno', count: 2, bpm: [142, 150], years: [2021, 2026], length: [300, 360] },
  { genre: 'Nu Disco / Disco', count: 5, bpm: [112, 122], years: [1978, 2026], length: [300, 400] },
  { genre: 'Organic House / Downtempo', count: 3, bpm: [110, 118], years: [2016, 2026], length: [380, 470] },
  { genre: 'Indie Dance', count: 3, bpm: [115, 123], years: [2010, 2026], length: [330, 410] },
  { genre: 'Pop', count: 3, bpm: [100, 124], years: [1984, 2025], length: [190, 240] },
  { genre: 'Hip-Hop', count: 2, bpm: [88, 100], years: [1994, 2024], length: [200, 250] },
  { genre: 'R&B', count: 2, bpm: [90, 104], years: [1998, 2012], length: [210, 250] },
  { genre: 'Funk / Soul', count: 2, bpm: [104, 116], years: [1975, 1984], length: [220, 280] },
  { genre: 'Dance / EDM', count: 3, bpm: [124, 128], years: [2009, 2024], length: [190, 230] },
  { genre: '2000s', count: 2, bpm: [118, 128], years: [2001, 2009], length: [200, 240] },
]

const DEMO_TAGS = ['banger', 'secret-weapon', 'overplayed', 'vocal', 'instrumental', 'opener', 'closer']

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function letters(i: number): string {
  // 0 → A, 25 → Z, 26 → AA ...
  let s = ''
  let n = i
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

function buildDemo(): StoredTrack[] {
  const rnd = mulberry32(20261101)
  const keys: string[] = []
  for (let n = 1; n <= 12; n++) keys.push(`${n}A`, `${n}B`)
  // Shuffle keys deterministically, then cycle so every key appears 3+ times.
  const order = keys.map((k) => ({ k, r: rnd() })).sort((a, b) => a.r - b.r).map((x) => x.k)
  const out: StoredTrack[] = []
  let i = 0
  for (const spec of SPECS) {
    for (let j = 0; j < spec.count; j++) {
      const n = i + 1
      const bpm = Math.round(spec.bpm[0] + rnd() * (spec.bpm[1] - spec.bpm[0]))
      const year = Math.round(spec.years[0] + rnd() * (spec.years[1] - spec.years[0]))
      const lengthSec = Math.round(spec.length[0] + rnd() * (spec.length[1] - spec.length[0]))
      const tagRoll = rnd()
      const demoTags: string[] = []
      if (tagRoll < 0.12) demoTags.push('banger')
      else if (tagRoll < 0.18) demoTags.push(DEMO_TAGS[1 + Math.floor(rnd() * (DEMO_TAGS.length - 1))]!)
      const day = String(1 + Math.floor(rnd() * 28)).padStart(2, '0')
      const month = String(1 + Math.floor(rnd() * 10)).padStart(2, '0')
      out.push({
        id: `demo:${String(n).padStart(2, '0')}`,
        artist: `Demo Artist ${String((i % 40) + 1).padStart(2, '0')}`,
        title: `Demo Track ${letters(i)}`,
        remix: rnd() < 0.2 ? `Demo Remix ${letters(i % 7)}` : null,
        album: null,
        label: null,
        genre: spec.genre,
        bpm,
        keyRaw: order[i % order.length]!,
        camelot: order[i % order.length]!,
        lengthSec,
        year,
        rating: Math.floor(rnd() * 6),
        comment: null,
        dateAdded: `2026-${month}-${day}`,
        playlists: [],
        source: 'demo',
        status: 'active',
        demoTags,
      })
      i++
    }
  }
  return out
}

export const DEMO_TRACKS: readonly StoredTrack[] = Object.freeze(buildDemo())
