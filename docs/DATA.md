# DATA · Schemas and contracts

## 1. `tracks.json` (written by the laptop sync tool, read by the app)

Lives in the PRIVATE data repo (`setlab-data`, path `tracks.json`). Never in the app repo.

```jsonc
{
  "schema": 1,
  "generatedAt": "2026-11-01T21:04:00Z",
  "source": "pyrekordbox" | "rekordbox-xml",
  "rekordboxVersion": "7.x.x",
  "count": 1248,
  "tracks": [
    {
      "id": "rb:12345",            // stable: "rb:" + rekordbox content ID
      "artist": "string",
      "title": "string",
      "remix": "string|null",       // parsed from title "(... Remix)" if no field
      "album": "string|null",
      "label": "string|null",
      "genre": "string|null",       // raw rekordbox genre
      "bpm": 124.0,                 // float, null if not analyzed
      "keyRaw": "Am",               // as stored by rekordbox
      "camelot": "8A",              // computed by the sync tool with the same table as the app
      "lengthSec": 372,
      "year": 2004,
      "rating": 0,                  // rekordbox stars 0 to 5
      "comment": "string|null",
      "dateAdded": "2026-10-20",
      "playlists": ["Party 2000s", "Warm-up"],
      "myTag": ["string"]           // rekordbox My Tag if available
    }
  ]
}
```
No file paths, no personal notes beyond rekordbox comment. Max size target < 3 MB for 5,000 tracks (minified).

## 2. Local database (Dexie, on the phone)

| Table | Key | Content |
|---|---|---|
| `tracks` | id | Synced tracks (from tracks.json) + wishlist / quick-add tracks (`id: "local:<uuid>"`) |
| `overrides` | trackId | Manual edits: energy, genre, tags, notes. Never touched by sync |
| `estimates` | trackId | AI estimates: bpm, camelot, genre, energy, year, confidence, model, date |
| `sets` | id | Saved sets: name, mode, options, ordered trackIds, locks, score snapshot, notes, tags, createdAt |
| `sessions` | id | Live / practice sessions: start, end, ordered plays [{trackId, at}] |
| `ratings` | `${fromId}>${toId}` | rating (-1, 0, 1 → 👎 👌 🔥), note, date |
| `missing` | id | Missing-tracks results: artist, title, remix, est fields, mode, status (missing / pending / owned), matchedTrackId, savedAt |
| `aiCache` | hash(prompt) | AI responses cache with date (TTL per feature, see AI.md) |
| `aiUsage` | yyyy-mm | input/output tokens, web searches, est. cost |
| `settings` | key | All settings, tokens and API keys |

Track "effective" value per field = override > rekordbox > estimate > heuristic; the UI shows the source badge.

## 3. Merge rules on sync

1. Upsert all `rb:` tracks from tracks.json. Tracks absent from the new file are marked `removed` (kept for history, hidden from library).
2. For each `local:` wishlist track and each `missing` item with status pending: fuzzy match against new `rb:` tracks (normalize: lowercase, strip accents, "feat."/"ft.", brackets, "original mix", punctuation; compare artist + title, remix-aware; threshold tuned in tests). On match: move overrides/ratings/history to the `rb:` id, set missing status 🟢 owned, delete the local track.
3. Report: "+12 new · 2 removed · 3 wishlist tracks confirmed".

## 4. Matching text lists to the library
Same normalizer. Return top match with confidence; < threshold → "unknown track" row with "estimate" / "edit" actions.

## 5. Genres for dropdowns (with typical BPM range for slider snap)

| Genre | Typical BPM |
|---|---|
| Afro House | 120 to 126 |
| Amapiano | 108 to 116 |
| Bass House | 124 to 130 |
| Breaks / Breakbeat | 125 to 140 |
| Deep House | 118 to 124 |
| Drum & Bass | 170 to 180 |
| Dubstep | 140 to 150 |
| Hard Techno | 140 to 160 |
| House | 120 to 126 |
| Indie Dance | 115 to 124 |
| Melodic House & Techno | 120 to 124 |
| Minimal / Deep Tech | 124 to 130 |
| Nu Disco / Disco | 110 to 122 |
| Organic House / Downtempo | 110 to 120 |
| Progressive House | 124 to 128 |
| Tech House | 122 to 128 |
| Techno (Peak Time / Driving) | 128 to 138 |
| Techno (Raw / Deep / Hypnotic) | 120 to 138 |
| Trance (Main Floor) | 132 to 140 |

BPM slider range 60 to 180, dual handle.

## 6. Demo library
`src/demo/demoTracks.ts`: ~80 fictional tracks ("Demo Artist 07 · Demo Track K") spread over keys, BPMs, genres, years so every feature can be tried before the first sync. Loaded automatically when there is no synced data; clearly labelled "DEMO" in the header.

## 7. Backup format
`{ app: "setlab", schema: 1, exportedAt, tables: { ...all tables except tracks } }`. API keys excluded by default, checkbox to include.
