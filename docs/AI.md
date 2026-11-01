# AI · Claude API usage

The engine never needs AI. AI adds: estimates for unknown tracks, web discovery of missing tracks, gap filling, short explanations. All AI features hide or show a "Add your API key in Settings" hint when no key is set.

## 1. Connection
- Direct browser call to the Anthropic Messages API with Nico's key from Settings (stored locally only). Verify in current docs: endpoint, required headers, and the header that enables direct browser access (CORS). Log in DECISIONS.md.
- Models (verify current IDs and prices before coding, keep them in `src/ai/models.ts` and selectable in Settings):
  - **Fast/cheap** model for estimates (BPM/key/genre/energy/year of a named track).
  - **Main** model with the web search server tool for discovery (Missing tracks, Trending, Fill a gap).
- Every request uses a system prompt built from `docs/CURATOR_VOICE.md` (DJ rules, honesty, confidence levels), shortened to what the feature needs.
- **Structured output only**: ask for JSON matching a schema, validate with zod, retry once on invalid JSON, then show an error. No free-text parsing.
- Never use the em dash in prompts or expected output; strip it from AI text before display.

## 2. Features and contracts

| Feature | Model | Web search | Output schema | Cache TTL |
|---|---|---|---|---|
| Estimate track | fast | optional (only if confidence low) | `{bpm, camelot, keyName, genre, energy, year, confidence: "high"/"medium"/"low", note}` | 90 days |
| Missing · Classics by era/genre | main | yes | `{tracks: [{artist, title, remix, year, genre, estBpm, estCamelot, energy, why}]}` max 25 | 14 days |
| Missing · Party type | main | yes | same | 14 days |
| Missing · Trending Beatport | main | yes | same + `{chart: "top100"/"hype"/"new", trendNote}` max 10 | 1 day |
| Missing · Fill a gap | main | yes | same, max 10, must fit target key ±1 and BPM band | 7 days |
| Party gap suggestions | main | yes | same, max 5 per gap | 7 days |
| Explain transition (optional button) | fast | no | `{tip: string ≤ 240 chars}` (EQ, loop, phrasing advice) | 90 days |

Rules sent in every discovery prompt:
- Only real, verifiable releases. If unsure a track exists, leave it out.
- Give confidence per field; the app shows 🟡 estimated badges.
- Exclude tracks already owned: send a compact list of the library's normalized "artist · title" strings relevant to the query (filter by genre/era first, cap ~400 entries) so results are mostly new. The app still re-checks ownership locally.

## 3. Cost guardrails
- `aiUsage` table tracks tokens and web searches per month; Settings shows "This month: ~€X.XX of €Y budget" (prices from `models.ts`, labelled approximate).
- Default monthly budget €5, editable. At 80% show a warning; at 100% AI buttons ask for confirmation.
- Cache first (by prompt hash). Debounce. Never call AI in loops without user action, except: when a text list has ≤ 10 unknown tracks, offer one batched "Estimate all" call.
- Batch estimates: up to 20 tracks per request.

## 4. Spotify (OPTIONAL, try once, never block)
Nico said: if Spotify cannot be connected, just use web search.
- Check current Spotify Web API docs: PKCE auth from a static site, playlist + saved tracks endpoints for new apps, redirect URI rules for GitHub Pages.
- If usable: Settings → "Connect Spotify" (requires Nico to create a Spotify developer app: human task with exact steps). Read playlists + liked songs → normalized list → compare with library → missing items enter the Missing list with mode "spotify". Audio features (BPM/key) are probably not available for new apps: do not rely on them; estimate via AI or leave blank.
- If not usable or too restrictive: skip it entirely, hide the chip, log the reason in DECISIONS.md and the status block of HUMAN_TASKS.md.

## 5. Beatport copy helper
- `toBeatportQuery(track, "full"|"short")`: strip `feat./ft./featuring` parts, brackets, dashes, "Original Mix", extra spaces. Full = artist + title + remix name; Short = main artist + title.
- Also an "Open Beatport" link using Beatport's search URL (verify format) as a secondary action. Primary action stays 📋 Copy (Nico pastes into the Beatport app).
