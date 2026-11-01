# SETLAB · Master brief for Claude Code

You are building **SETLAB**, a personal DJ web app for one user (Nico). It runs on his phone as an installable PWA, hosted on GitHub Pages from this repo. "SETLAB" is a working title: keep the name in ONE constant (`src/config.ts` → `APP_NAME`) so it can be renamed in one line.

## 🎯 Mission

The heart of the app is a **set organizer**: from Nico's track library (artist, title, BPM, Camelot key, genre, energy, length, year) it suggests the best set orders and combinations using harmonic mixing (Camelot wheel), BPM flow, genre coherence and energy storytelling. Every other feature supports that core.

Hardware context: Nico mixes on a Pioneer DDJ-FLX4 with rekordbox on a Windows (Lenovo) laptop. The phone app cannot control the controller or rekordbox. The bridge is a library sync script that runs on the laptop (see `docs/SYNC.md`).

## 🤖 How you must work: fully autonomous

Nico wants this built **without him doing anything** except tasks you genuinely cannot do (creating accounts, entering secrets, running things on his laptop or phone).

1. Read every file in `/docs` before writing code. They are the spec. Load the design skills listed at the top of `docs/DESIGN.md` before any UI work.
2. Build phase by phase following `docs/PHASES.md`. Do not skip acceptance checks.
3. **Do not stop to ask questions.** When something is ambiguous, pick the most reasonable option, log it in `DECISIONS.md` (one line: date, decision, why) and continue.
4. Run tests and the build after each phase. Fix failures before moving on.
5. Commit after each phase with a clear message (`phase 2: sets tab`) and push.
6. When you hit something only Nico can do, **append it to `HUMAN_TASKS.md`** under "Added by Claude Code" in the same visual format, then keep building. Never block the whole build on a human task: make the feature work without it or degrade gracefully (clear empty state + "how to enable" hint).
7. At the very end, update the status block at the top of `HUMAN_TASKS.md`: what is live, the app URL, remaining human steps in order.

## ✅ Verify, never invent

These external pieces change over time. Check current official docs (web search / fetch) before implementing each one, and log what you found in `DECISIONS.md`:

- **Anthropic Messages API**: current model IDs, the header that allows direct browser (CORS) calls, the web search server tool name/version, pricing for the cost meter.
- **pyrekordbox**: support for Nico's rekordbox version (6 or 7), how it opens the encrypted `master.db`, field names for BPM, key, genre, length, year, date added, rating, playlists.
- **rekordbox XML** format (for the fallback import and for "Send to rekordbox" playlists).
- **Spotify Web API**: OAuth PKCE for static sites, which endpoints new apps can still use. Spotify is OPTIONAL (see `docs/PRODUCT.md`).
- **Beatport search URL** format for the "open in Beatport" helper.

If a capability turns out unavailable, build the documented fallback and note it in the `HUMAN_TASKS.md` status block.

Never invent track metadata in code, seeds or tests. Demo data uses clearly fictional tracks ("Demo Artist 01 · Demo Track A").

## 🧱 Stack (default, change only with a logged reason)

- Vite + React + TypeScript (strict)
- Tailwind CSS, fonts self-hosted via Fontsource (must work offline)
- Dexie (IndexedDB) for all on-device data
- vite-plugin-pwa: installable, offline app shell, engine and wheel work offline
- Vitest (unit), Playwright (one mobile smoke test at 390×844)
- GitHub Actions: test + build + deploy to GitHub Pages on push to `main`
- Python 3.11+ for the laptop sync tool in `/sync`

## 🔒 Privacy & data rules

- Personal data (sets, tags, ratings, history, API keys, tokens) lives **only on the device**. Never commit it, never log it.
- Track library data does NOT live in this app repo. The sync tool pushes `tracks.json` to a separate **private** data repo (see `docs/SYNC.md` and `docs/DATA.md`). The app reads it with a read-only token entered in Settings.
- API keys are entered by Nico in Settings and stored locally. Never hardcode them.
- Settings → Backup: export / import all local data as one JSON file.

## 🧭 Docs map

| File | Covers |
|---|---|
| `docs/PRODUCT.md` | Every feature, tab by tab |
| `docs/ENGINE.md` | Camelot logic, scoring, set generation, pathfinding |
| `docs/DATA.md` | Schemas, `tracks.json` contract, merge rules |
| `docs/SYNC.md` | Laptop sync tool (rekordbox → private data repo) |
| `docs/AI.md` | Claude API usage, prompts, cost guardrails |
| `docs/CURATOR_VOICE.md` | Nico's original curator prompt: tone and DJ rules for every AI call |
| `docs/DESIGN.md` | Visual system, mobile and DJ-booth constraints |
| `docs/PHASES.md` | Build order and acceptance criteria |
| `HUMAN_TASKS.md` | What only Nico can do |
| `DECISIONS.md` | Your log of choices |

## ✍️ Writing rule for all UI copy and docs

Never use the em dash character (U+2014) anywhere: UI strings, AI prompts, docs, commit messages. Use a colon, a middle dot `·`, or a new sentence. Add a test that fails if `src/` contains it.

## 🏁 Definition of done

- App live on GitHub Pages, installable on a phone, works offline for everything except AI and sync fetches.
- All phases in `docs/PHASES.md` checked off.
- `npm test`, `npm run build` and the Playwright smoke test pass.
- The engine works fully with zero AI (no API key) and with demo data (no library synced yet).
- `HUMAN_TASKS.md` status block is current.
