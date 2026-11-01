# ENGINE · The harmonic brain

Pure TypeScript in `src/engine/`, no React, no network, fully unit tested. Deterministic: every function that randomizes takes a seed.

## 1. Camelot model

- Camelot code = number 1 to 12 + letter A (minor) or B (major).
- Build a complete 24-entry mapping table between Camelot and musical keys, including enharmonic spellings (e.g. `8A = Am`, `5A = Cm`, `3B = Db = C#`). rekordbox may store keys as musical notation (`Am`, `F#m`, `Db`) or Open Key; write a `parseKey(raw)` that accepts all and returns Camelot or `null`. Verify the exact rekordbox key format against pyrekordbox docs.
- Camelot colours: use the conventional Mixed In Key style wheel colours (one hue per number, A slightly darker than B). Keep them in `src/engine/camelot.ts`.

### Key relationships (from track A to track B)

| Move | Example | Label | Key score |
|---|---|---|---|
| Same key | 8A → 8A | perfect | 1.00 |
| ±1 same letter | 8A → 9A / 7A | perfect | 0.95 |
| Relative A↔B same number | 8A → 8B | perfect | 0.90 |
| Diagonal (+1 and switch letter) | 8A → 9B | good | 0.70 |
| +2 same letter (energy boost) | 8A → 10A | boost | 0.60 |
| +7 same letter (semitone up) | 8A → 3A | boost | 0.55 |
| −1 and switch letter | 8A → 7B | ok | 0.50 |
| Anything else | | clash | 0.10 |

Numbers wrap (12 → 1). Unknown key on either side → 0.5 with label "unknown".

### Pitch shift awareness
If keylock is OFF in Settings, pitching changes key: every ±~6% tempo ≈ 1 semitone ≈ +7 / −7 Camelot steps. Implement `effectiveKey(track, targetBpm, keylock)`. Default keylock ON (no shift).

## 2. BPM model

- `bpmDistance(a, b)`: consider half/double time (e.g. 87 ↔ 174, 64 ↔ 128): take the min of |a−b|, |a−2b|, |2a−b| in percent of a.
- Within max pitch % (Settings, default 6%): mixable.

| Δ BPM % | BPM score |
|---|---|
| ≤ 1.5% | 1.00 |
| ≤ 3% | 0.85 |
| ≤ 5% | 0.60 |
| ≤ max pitch % | 0.40 |
| beyond | 0.05 |

## 3. Genre model

- Genre families table in `src/engine/genres.ts` (editable in Settings). Start with:
  - House family: House, Deep House, Tech House, Bass House, Afro House, Organic House, Progressive House, Nu Disco / Disco, Indie Dance, Minimal / Deep Tech
  - Techno family: Techno (Peak Time / Driving), Techno (Raw / Deep / Hypnotic), Hard Techno, Melodic House & Techno
  - Bridge links: Melodic House & Techno ↔ Progressive House ↔ Deep House; Tech House ↔ Minimal / Deep Tech ↔ Techno (Raw); Afro House ↔ Organic House ↔ Amapiano
  - Bass family: Drum & Bass, Dubstep, Breaks / Breakbeat
  - Open format: Pop, Hip-Hop, R&B, Dance / EDM, Latin, Reggaeton, Funk / Soul, 2000s, 90s, Rock (for party sets)
- `normalizeGenre(raw)` maps rekordbox free-text genres to these labels (case-insensitive aliases, unknown kept as-is with family "other").
- Score: same genre 1.0 · same family 0.75 · bridge link 0.6 · open-format to anything 0.5 · different family 0.2 · unknown 0.5.

## 4. Energy model

Energy 1 to 10 per track. Source priority: ✏️ manual override > 🟡 AI estimate > heuristic.
Heuristic (always available): base by genre (e.g. Deep House 4, Tech House 6, Peak Time Techno 8, Hard Techno 9, Lounge-type 3) adjusted by BPM relative to genre typical range (±1) and tags (🔥 banger +1). Mark source `heuristic`.

Energy transition score depends on the intended direction (from the target arc):
- delta matches intended direction and |Δ| ≤ 2 → 1.0
- flat when the arc wants flat → 1.0
- |Δ| = 3 in the right direction → 0.6
- wrong direction by 1 → 0.6, by 2+ → 0.2
- drop of 3+ (crash) when not in a "release" phase → 0.05

## 5. Transition score

```
transition = 100 × (wKey·key + wBpm·bpm + wGenre·genre + wEnergy·energy) + personal + tags
default weights: key 0.40 · bpm 0.25 · energy 0.20 · genre 0.15 (sum 1)
```
- `personal`: from Practice ratings. Exact pair rated 🔥 +8, 👌 +2, 👎 −15. Pattern bonus (same key move label + BPM delta bucket) averaged from ratings, capped at ±4.
- `tags`: 😴 overplayed −5 per use, recently played (history, last N days) −6.
- Clamp 0 to 100. Colour: 🟢 ≥ 75 · 🟡 50 to 74 · 🔴 < 50.
- Every score returns `reasons: string[]` for UI ("8A → 9A · +1", "BPM +0.8%", "same genre", "energy +1 ✓").
- Weights per mode:

| Mode | key | bpm | energy | genre | Extra |
|---|---|---|---|---|---|
| 🟢 Smooth | 0.45 | 0.30 | 0.10 | 0.15 | prefer monotonic BPM drift |
| 🔥 Journey | 0.30 | 0.20 | 0.35 | 0.15 | follow target arc |
| 🎨 Key tour | 0.40 | 0.20 | 0.20 | 0.20 | bonus +5 for moving to a key not yet used in the set, penalty −5 for staying on the same key > 3 tracks |

## 6. Energy arcs (targets)

Arc = function `t ∈ [0,1] → target energy`. Defaults:
- Full arc: 4 → 5 → 7 → 9 → 7 (release) → 9 (final climax) → 6 (landing). Phases: warm-up, groove, build, peak, release, final climax, landing.
- Peak-time: 7 → 9 plateau with small 1-point dips every ~20%.
- Opener / warm-up: 3 → 6 gentle ramp, never above 6.
- Closer / sunrise: 7 → 4 descent with one emotional bump.
- Tension build: 5 → 9 steady climb, no dips.
Set score adds `arcFit` = 100 − mean absolute error × 12 (clamped).

## 7. Set generation

`generateSets(pool, options) → SetResult[3]` (one per mode). Requirements:
- Respect locks (must-include) and pins (first / last).
- Duration fit: choose N tracks so that `Σ length − (N−1) × overlap` is within ±5% of target. If pool is too small, return the best possible and a warning.
- Algorithm (good enough, fast): beam search (width 12) building the sequence step by step with the transition score + arc fit at the current position, then 2-opt / swap local improvement for up to 300 ms. Run off the main thread (Web Worker) for pools > 200 tracks.
- Diversity: the 3 versions must differ (≤ 50% same tracks in the same positions); if not, re-run the later mode with a penalty on reused positions.
- `SetResult`: ordered tracks, per-transition scores and reasons, total score (mean transition × 0.7 + arcFit × 0.3), duration, warnings, phase label per track.
- Performance budget: 40-track pool < 300 ms, 2,000-track library fill < 1.5 s on a mid phone.

## 8. Graph tools

Build a directed weighted graph over the library (edge = transition score ≥ 50; cost = 100 − score). Cache, rebuild on library change.
- `nextTracks(now, filters, k=5)`: top k outgoing edges, excluding played.
- `bestBefore(t, k=3)`, `bestAfter(t, k=3)`.
- `path(from, to, maxHops=4)`: Dijkstra limited to ≤ 3 intermediate tracks; return best path with total and per-step scores, plus estimated minutes (sum of lengths minus overlaps, or 4 min per track if unknown).
- `bridges(a, b)`: best single tracks X maximizing min(score(a,X), score(X,b)), and best 2-track bridge.
- `fitScore(candidate)`: for Missing tracks, number of library tracks with score ≥ 75 in or out (the "fits in N sets" proxy).

## 9. Party presets

`src/engine/parties.ts`: each preset = { genres allowed + weights, BPM band, era weighting curve, energy arc, max same-artist repeats }. Example Wedding: open format + house, 95 to 128 BPM, era weighted to crowd age (nostalgia peak at age 15 to 25 of the median guest → years), arc Full. Crowd age slider shifts the era weighting. Era slider hard-filters years when set.

## 10. Tests (minimum)

- All 24 keys parse from musical, Camelot and Open Key notations; enharmonics.
- Key relationship table incl. wrap 12 → 1 and +7.
- Half/double time BPM.
- Locks and pins always respected; duration within ±5% when pool allows.
- Path finder returns ≤ 3 intermediates and the optimal path on a small hand-built graph.
- Deterministic output for the same seed.
- 3 versions are diverse.
