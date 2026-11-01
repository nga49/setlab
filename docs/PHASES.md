# PHASES · Build order

Work top to bottom. After each phase: `npm test` + `npm run build` green, update `DECISIONS.md`, commit, push. Tick the boxes in this file as you go.

## Phase 0 · Foundation
- [x] Vite + React + TS + Tailwind + Dexie + PWA + Vitest + Playwright set up
- [x] `src/config.ts` with `APP_NAME = "SETLAB"`
- [x] Tab shell (Sets, Live, Library, Practice) + Settings sheet + floating wheel button placeholder
- [x] Design tokens and fonts per `DESIGN.md`
- [x] GitHub Actions: test, build, deploy to GitHub Pages (correct `base` path for a project page)
- [x] Em dash guard test
- [x] Demo library loaded
- **Accept**: site deploys, installable, offline shell loads, Lighthouse PWA checks pass.

## Phase 1 · Engine
- [x] `camelot.ts`, `bpm.ts`, `genres.ts`, `energy.ts`, `score.ts`, `arcs.ts`, `generate.ts`, `graph.ts`, `parties.ts` per `ENGINE.md`
- [x] Web Worker wrapper for heavy generation
- [x] All tests from `ENGINE.md` §10
- **Accept**: coverage ≥ 90% on `src/engine`, performance budgets met in a benchmark test.

## Phase 2 · Camelot wheel
- [x] Full-screen wheel, highlights, library counts, tap-to-filter
- **Accept**: opens < 150 ms, works offline, correct highlights for 8A, 12B, 1A (wrap).

## Phase 3 · Sets tab
- [x] Organizer: pick / paste, modes, arcs, locks, pins, duration fit, pool option
- [x] 3 version cards, transition dots + reasons, swap, bridge
- [x] Drag reorder with live rescoring, regenerate keeping locks
- [x] Save / open / duplicate / delete sets
- [x] Party set generator with presets, sliders, gap cards
- **Accept**: with demo data, a 60-min Journey set with 2 locks generates in < 1 s and lands within ±5% duration.

## Phase 4 · Live tab
- [x] Now playing search, Top 5 next with filters, session logging
- [x] Request handler: before, after, path from now
- [x] Bridge finder
- [x] Gig mode + wake lock
- **Accept**: Playwright test: set now playing → pick a next track → request a track → path shown, all at 390×844.

## Phase 5 · Library + Sync
- [x] Virtualized track list, filters, detail sheet, overrides, tags
- [x] Sync fetch from private data repo, ETag, merge rules, report, error messages
- [x] Quick-add (manual)
- [x] Insights: heatmap, BPM histogram, genre and era bars, gap finder
- [x] `/sync` Python tool + `install.bat` + tests with fixtures (DB mocked, XML fixture)
- [x] Shared key table check between Python and TS
- [x] Create private `setlab-data` repo with a placeholder `tracks.json` if you have permission; else add to HUMAN_TASKS (no permission: in HUMAN_TASKS)
- **Accept**: loading a 5,000-track fixture stays smooth (no frame > 50 ms while scrolling in a perf test), merge tests pass, `pytest` passes.

## Phase 6 · AI features
- [x] Settings: key, models, budget, cost meter
- [x] Client with zod schemas, cache, usage tracking, error handling
- [x] Estimate track (single + batch) and wiring into quick-add, pasted lists, request handler
- [x] Missing tracks finder: all modes, status flow, Copy (Full / Short), Got it, shopping list
- [x] Party gap suggestions, explain transition
- [x] Spotify: research, implement if usable, otherwise hide and document (hidden: see DECISIONS)
- **Accept**: all AI calls mocked in tests; app fully usable with no key; one manual-style test with a recorded fixture response for each schema.

## Phase 7 · Practice
- [ ] Session history, manual practice log
- [ ] Rate transitions, ratings feed the engine (tests)
- [ ] Export: rekordbox playlist XML (verified format), text, M3U, share sheet
- **Accept**: exported XML validates against the documented structure; rating 🔥 a pair raises it in Next track results (test).

## Phase 8 · Polish and handover
- [ ] Backup export / import, reset
- [ ] Install hint, icons, splash
- [ ] Accessibility pass (contrast, labels, focus)
- [ ] Final Playwright smoke test across all tabs
- [ ] `README.md` (short) + update `HUMAN_TASKS.md` status block with live URL and remaining steps in order
- **Accept**: Definition of done in `CLAUDE.md` met.
