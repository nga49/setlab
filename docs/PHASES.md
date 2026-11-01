# PHASES · Build order

Work top to bottom. After each phase: `npm test` + `npm run build` green, update `DECISIONS.md`, commit, push. Tick the boxes in this file as you go.

## Phase 0 · Foundation
- [ ] Vite + React + TS + Tailwind + Dexie + PWA + Vitest + Playwright set up
- [ ] `src/config.ts` with `APP_NAME = "SETLAB"`
- [ ] Tab shell (Sets, Live, Library, Practice) + Settings sheet + floating wheel button placeholder
- [ ] Design tokens and fonts per `DESIGN.md`
- [ ] GitHub Actions: test, build, deploy to GitHub Pages (correct `base` path for a project page)
- [ ] Em dash guard test
- [ ] Demo library loaded
- **Accept**: site deploys, installable, offline shell loads, Lighthouse PWA checks pass.

## Phase 1 · Engine
- [ ] `camelot.ts`, `bpm.ts`, `genres.ts`, `energy.ts`, `score.ts`, `arcs.ts`, `generate.ts`, `graph.ts`, `parties.ts` per `ENGINE.md`
- [ ] Web Worker wrapper for heavy generation
- [ ] All tests from `ENGINE.md` §10
- **Accept**: coverage ≥ 90% on `src/engine`, performance budgets met in a benchmark test.

## Phase 2 · Camelot wheel
- [ ] Full-screen wheel, highlights, library counts, tap-to-filter
- **Accept**: opens < 150 ms, works offline, correct highlights for 8A, 12B, 1A (wrap).

## Phase 3 · Sets tab
- [ ] Organizer: pick / paste, modes, arcs, locks, pins, duration fit, pool option
- [ ] 3 version cards, transition dots + reasons, swap, bridge
- [ ] Drag reorder with live rescoring, regenerate keeping locks
- [ ] Save / open / duplicate / delete sets
- [ ] Party set generator with presets, sliders, gap cards
- **Accept**: with demo data, a 60-min Journey set with 2 locks generates in < 1 s and lands within ±5% duration.

## Phase 4 · Live tab
- [ ] Now playing search, Top 5 next with filters, session logging
- [ ] Request handler: before, after, path from now
- [ ] Bridge finder
- [ ] Gig mode + wake lock
- **Accept**: Playwright test: set now playing → pick a next track → request a track → path shown, all at 390×844.

## Phase 5 · Library + Sync
- [ ] Virtualized track list, filters, detail sheet, overrides, tags
- [ ] Sync fetch from private data repo, ETag, merge rules, report, error messages
- [ ] Quick-add (manual)
- [ ] Insights: heatmap, BPM histogram, genre and era bars, gap finder
- [ ] `/sync` Python tool + `install.bat` + tests with fixtures (DB mocked, XML fixture)
- [ ] Shared key table check between Python and TS
- [ ] Create private `setlab-data` repo with a placeholder `tracks.json` if you have permission; else add to HUMAN_TASKS
- **Accept**: loading a 5,000-track fixture stays smooth (no frame > 50 ms while scrolling in a perf test), merge tests pass, `pytest` passes.

## Phase 6 · AI features
- [ ] Settings: key, models, budget, cost meter
- [ ] Client with zod schemas, cache, usage tracking, error handling
- [ ] Estimate track (single + batch) and wiring into quick-add, pasted lists, request handler
- [ ] Missing tracks finder: all modes, status flow, Copy (Full / Short), Got it, shopping list
- [ ] Party gap suggestions, explain transition
- [ ] Spotify: research, implement if usable, otherwise hide and document
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
