# PRODUCT · Every feature

One user, phone first, used at home (prep) and behind the decks (live). 4 tabs + a floating wheel.

| Tab | Purpose |
|---|---|
| 🎛️ **Sets** | Build and organize sets (the core) |
| ▶️ **Live** | Fast decisions while mixing |
| 📚 **Library** | Tracks, sync, analysis, missing tracks |
| 📝 **Practice** | Ratings, history, export |
| ⚙️ Settings | Gear icon in the header, not a tab |

Legend: 🟢 works offline, no AI · 🟣 needs Claude API key · 🔵 needs sync data

---

## 🎡 Camelot wheel (global, floating)

- Floating round button bottom-right on every screen (above the tab bar). One tap → full-screen wheel. Swipe down or tap ✕ to close. 🟢
- 24 segments: outer ring B (major), inner ring A (minor), each in its Camelot colour, showing Camelot code + musical key (e.g. `8A · Am`).
- Tap a key → highlight: 🟢 same, ±1, A↔B relative · 🟠 energy boost (+2, +7) · everything else dimmed.
- If a "Now playing" track is set (Live tab), its key is pre-selected and the wheel shows how many library tracks sit in each compatible key.
- Under the wheel: compact list "In your library: 8A (14) · 9A (6) · 7A (11) · 8B (3)". Tap a key → filtered track list.
- Must open in under 150 ms. No network.

---

## 🎛️ Sets tab (the core)

### 1. Set Organizer 🟢🔵
Input: pick tracks from the library (search + multi-select), or paste a text list (matched against the library with fuzzy matching; unmatched lines become "unknown" tracks that can be estimated by AI 🟣).

Options:
- **Mode**: 🟢 Smooth · 🔥 Journey · 🎨 Key tour (see `ENGINE.md`)
- **Energy arc** (Journey only): Full arc · Peak-time · Opener / warm-up · Closer / sunrise · Tension build
- **Locks** ("Build around"): lock 1 to 3 tracks as must-play; optionally pin a track to position "first" or "last"
- **Duration fit**: target 30 / 60 / 90 / 120 min or custom. Uses real track lengths and an average mix overlap (default 60 s per transition, editable in Settings)
- **Pool**: "only the tracks I picked" or "picked tracks + fill from my library"

Output: **3 versions side by side** (swipeable cards on phone), one per mode, each showing:
- total score /100, duration, BPM range, key journey (mini Camelot chips)
- energy curve sparkline vs the target arc
- track list with a coloured dot per transition (🟢 great · 🟡 ok · 🔴 avoid) and the reason on tap ("8A → 9A · +1 · BPM +1 · same genre")
- 🔴 transitions get two buttons: **Swap** (best replacement from library) and **Bridge** (insert a connecting track, see Bridge finder)

Editing: drag to reorder, swipe to remove, lock icon per track. Score and colours update live (under 50 ms for 40 tracks). "Regenerate" keeps locks.

Save: name, date, tags, notes. Saved sets list with search.

### 2. Party set generator 🟢🔵 (+🟣 for gap suggestions)
- Party type chips: 🍾 Wedding · 🎂 Birthday · 🏖️ Beach / pool · 🌙 Club · 🏠 House party · 🍸 Lounge / dinner · ✏️ Custom
- Sliders: crowd age (18 to 70), era range (1970 to now, dual handle), energy (1 to 10), duration
- Optional free text: "lots of 2000s R&B, no hard techno"
- Each party type is a preset in code (default genres, BPM band, energy arc, era weighting). Presets are editable in Settings.
- Output: a full set from the library using the engine with genre/era filters and the preset arc.
- If the library cannot fill a phase well (fewer than 2 candidates scoring 🟢/🟡), show a 🔴 "gap" card in that position: "Missing: 2000s party anthem, ~8A, 124 BPM". With API key, "Suggest tracks" fills the gap card with AI picks that go to the Missing tracks list.

### 3. Saved sets
List, open, duplicate, delete, export (see Practice tab).

---

## ▶️ Live tab (big targets, glanceable)

### 1. Now playing + Next track finder 🟢🔵
- Search bar on top (instant, fuzzy, by artist/title). Pick the track that is playing → it becomes "Now playing" (big card: BPM, key chip in Camelot colour, energy, genre).
- Below: **Top 5 next tracks** from the library, ranked by transition score, with filters chips: ⬆️ energy up · ➡️ same · ⬇️ down, and "same genre only".
- Each suggestion shows why: "+1 key · BPM −1 · energy +1".
- Tap a suggestion → it becomes Now playing (history of the session kept, see Practice).
- Tracks already played this session are excluded.

### 2. Request handler 🟢🔵 (+🟣 if not in library)
- "Someone asked for…" input. Search library first.
- If found, show 3 blocks:
  - ⬅️ **Best before**: top 3 tracks that lead into it
  - ➡️ **Best after**: top 3 tracks that follow it
  - 🛤️ **Path from now**: shortest high-score path from Now playing to the request, max 3 intermediate tracks (Dijkstra, see `ENGINE.md`), shown as a chain with the key and BPM of each step and an estimated time ("~3 tracks · ~12 min")
- If not in library: with API key, AI estimates BPM/key/genre/energy (flagged 🟡 estimated) and the same 3 blocks are computed. Plus a 📋 Copy button for Beatport (see Missing tracks). Without key: manual BPM + key entry form.

### 3. Bridge finder 🟢🔵
- Pick track A and track B (or launched from a 🔴 transition). Shows the 3 best single-track bridges and the best 2-track bridge from the library.

### 4. Gig mode 🟢
- Toggle in the Live tab header. Pure black background, text minimum 20 px, only: Now playing, Next 3, Request button, wheel button. Screen wake lock on (Wake Lock API, graceful if unsupported). Reduced brightness palette (no pure white, max #CFCFCF).

---

## 📚 Library tab

### 1. Tracks 🟢🔵
- Full list, virtualized (must stay smooth with 5,000 tracks). Search, sort (artist, BPM, key, energy, added, year), filters (genre, BPM range slider, key, energy, tags, source).
- Track detail sheet: all fields, source badge per field (🟢 rekordbox · 🟡 AI estimate · ✏️ manual), edit energy/genre/tags/notes (stored as local overrides, never overwritten by sync).
- Tags: free tags + built-in ones: 🔥 banger · 🗡️ secret weapon · 😴 overplayed · 🎤 vocal · 🎹 instrumental · 🌅 opener · 🌙 closer. Engine uses them (see `ENGINE.md`).

### 2. Sync status 🔵
- Card at the top: "Last sync: today 21:04 · 1,248 tracks · +12 new". Pull-to-refresh fetches `tracks.json` from the private data repo.
- Shows sync errors in plain words with the fix ("Token expired: add a new one in Settings").

### 3. Quick-add (on the go) 🟢 (+🟣)
- "Add a track" form: artist + title (+ optional remix). With API key: "Estimate" fills BPM, key, genre, energy, year, flagged 🟡 estimated. Without key: manual fields.
- These tracks are `status: wishlist` until the next sync finds a match, then they merge (see `DATA.md`).

### 4. Library insights 🟢🔵
- **Camelot heatmap**: wheel coloured by track count per key.
- **BPM histogram** and **genre bars** and **era bars** (by year).
- **Gap finder**: lists weak spots, e.g. "9A at 120 to 126: only 1 track", ranked by how often that key/BPM zone appears in Nico's saved sets and generated sets. Each gap has "Find tracks" (🟣) → Missing tracks finder pre-filled.

### 5. Missing tracks finder 🟣 (+🔵 to compare)
Goal: tell Nico which tracks he should add to his collection.

Search modes (one screen, mode chips on top):
- 🕰️ **Classics by era / genre**: e.g. era 2000 to 2009 + "party anthems / R&B / house". AI uses web search to list well-known tracks.
- 🎉 **For a party type**: reuses party presets.
- 📈 **Trending on Beatport**: genre dropdown (same 19 genres as the old artifact, see `DATA.md`) + dual-handle BPM slider that snaps to the genre's typical range + optional vibe. AI uses web search on Beatport charts.
- 🧩 **Fill a gap**: from Gap finder (key + BPM + genre target).
- 🎧 **From Spotify (optional)**: only if Spotify connection works (see `AI.md` / Spotify section). Reads Nico's playlists and liked songs, lists those not in his library. If unavailable, this chip is hidden and nothing breaks.

Results list, each row:
- Artist · Title (Remix) · year · est. BPM · est. key · genre
- Status: 🔴 missing · 🟢 owned (fuzzy matched to library) · ⏳ pending (ticked "got it", waiting for sync)
- "Fits in N of your sets" score (how well it connects to the library graph)
- 📋 **Copy** button: copies a Beatport-ready search string. Long-press or a toggle offers two formats: **Full** `Artist Title Remix` and **Short** `Artist Title`. No punctuation that hurts search (strip "feat.", brackets, dashes). Toast "Copied · paste in Beatport".
- ✅ **Got it** → status ⏳ pending until a sync confirms it, then 🟢.
- Save the list ("Shopping list") with filters: missing / pending / owned.

---

## 📝 Practice tab

### 1. Session history 🟢
- Every Live session is logged automatically (tracks in order, timestamps). Also manual "Log a practice session" from a saved set.
- Engine uses history to avoid repeating the same set ("played in the last 14 days" soft penalty, configurable).

### 2. Rate transitions 🟢
- After a session, list of the transitions played: rate each 👎 / 👌 / 🔥 + optional note ("loop the intro").
- Ratings feed the engine as a personal bonus/penalty for that exact pair and, lightly, for that key move + BPM delta pattern (see `ENGINE.md`).

### 3. Export 🟢
- **Send to rekordbox**: export a set as a rekordbox-importable playlist XML (verify format), referencing tracks by their rekordbox IDs from sync. Shared via the phone share sheet or downloaded. HUMAN_TASKS explains the 3-click import on the laptop.
- **Text export**: numbered list with BPM and key, copy to clipboard.
- **M3U** export as a fallback.

---

## ⚙️ Settings

- Data repo + read-only token (for sync fetch), "Test connection" button.
- Claude API key, model choices, monthly budget cap, cost meter (see `AI.md`).
- Spotify connect (optional).
- Mix defaults: transition overlap seconds, max BPM pitch % (default 6), keylock assumed ON.
- Party presets editor, genre families editor (advanced, collapsible).
- Language: English UI (default). Keep strings in one file so French can be added later.
- Backup export / import (all local data, one JSON). Reset app.
- Demo mode toggle: loads fictional demo library (auto-on when no sync data yet).
