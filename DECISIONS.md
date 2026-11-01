# DECISIONS · log

Claude Code: one line per decision. Format: `YYYY-MM-DD · decision · why`.

| Date | Decision | Why |
|---|---|---|
| 2026-11-01 | Core = set organizer, engine is pure maths and offline | Free, fast, works behind the decks without network |
| 2026-11-01 | Library sync = laptop script (pyrekordbox) + phone quick-add | Nico never wants to export by hand |
| 2026-11-01 | Spotify optional; web search is the default for missing tracks | Nico's instruction |
| 2026-11-01 | Missing tracks use a Copy button (Full / Short), not buy links | Nico pastes into the Beatport app |
| 2026-11-01 | Library data in a separate private repo | App repo / Pages may be public; library stays private |
| 2026-11-01 | Design direction: original retro portable tape deck (walnut, aluminium, mustard, rust, teal) | Chosen by Nico, replaces the earlier dark Booth idea |
| 2026-11-01 | Use design skills listed in DESIGN.md if available | Nico's instruction |
| 2026-11-01 | Title font and app name supplied by Nico later; placeholders Bungee + "SETLAB", swappable in one place | Nico's instruction |
| 2026-11-01 | `docs/` was missing from the repo (web upload dropped the folder); Nico sent it as docs.zip, committed as-is | Spec must be in the repo for later sessions |
| 2026-11-01 | Toolchain: Vite 8, React 19, TypeScript 7, Tailwind 4 (Vite plugin), vite-plugin-pwa 2, Dexie 4, Vitest 5; Playwright pinned to 1.63 | Latest stable on npm today; Playwright matches the browser installed in the build container (CI installs its own) |
| 2026-11-01 | GitHub Actions versions: checkout v7, setup-node v7, setup-python v7, upload-pages-artifact v5, deploy-pages v5 | Checked the actions' release pages; configure-pages skipped (not needed for a plain static deploy) |
| 2026-11-01 | Tests run on every branch; deploy only from `main` | Pages environment only accepts the default branch; work happens on a feature branch |
| 2026-11-01 | "Lighthouse PWA checks" replaced by Playwright installability checks (manifest, 192/512 icons, active service worker, offline reload) | Lighthouse 12 removed the PWA category; its install criteria are what the test checks |
| 2026-11-01 | Design skills: high-end-visual-design, design-taste-frontend, apple-design-motion-web loaded; design-taste-frontend-v1 and gpt-taste used at critique time; imagegen skills not usable | No image generation tool in the session except Canva, which would write into Nico's Canva account; concepts were rendered as HTML instead |
| 2026-11-01 | Live screen: 3 HTML concepts (A faceplate + tape window + piano keys, B big tape-counter BPM + VU + big rows, C cassette label). Chosen: hybrid A + B | A has the strongest tape-deck identity, B is the most readable behind the decks |
| 2026-11-01 | Fonts: Bungee (title placeholder, shipped as public/fonts/title.woff2), Space Mono (data), Permanent Marker (set labels), Space Grotesk (UI text) | All open licence via Fontsource, self-hosted and precached for offline |
| 2026-11-01 | Icons: Phosphor (duotone/regular); emoji kept only for the spec's own vocabulary (tags, ratings, party types) | Taste skill bans hand-drawn and thick default icon sets; DESIGN wants visual over text |
| 2026-11-01 | App icon: original SVG cassette reel (mustard flange, three windows, paper hub) rendered to PNG by `npm run icons` | No image generation tool; fully original artwork |
| 2026-11-01 | Camelot colours: one hue per number in HSL (A darker than B), dark ink text, contrast ≥ 4.5 checked in tests | "Mixed In Key style" without copying exact proprietary values |
| 2026-11-01 | Hash routing (`#/live`), no router dependency | GitHub Pages has no SPA rewrites; hash routes work offline and on refresh |
| 2026-11-01 | Demo tracks generated deterministically in code (80 tracks, every key, 18 genres, years 1975 to 2026) | Stable tests and screenshots; clearly fictional names |
| 2026-11-01 | gpt-taste applied as a critique pass only for button contrast, meta-label sweep, horizontal overflow and reduced motion; its landing-page rules (hero, AIDA, GSAP, no emoji) do not apply to an app | DESIGN.md wins on theme and constraints; the spec defines emoji tags and ratings |
| 2026-11-01 | Energy rules filled in where ENGINE.md is silent: flat Δ±1 = 0.9, up with Δ0 = 0.8, "any" direction (Live) treats Δ±1 as 1.0 and Δ±2 as 0.85; a "down" arc segment counts as a release phase (no crash penalty for −3) | Spec table covers the main cases only; these keep the same spirit |
| 2026-11-01 | Smooth and Key tour use a "gentle" arc fitted to the pool (25th to 75th percentile energy); the arc choice applies to Journey only | PRODUCT.md: "Energy arc (Journey only)"; total score still needs an arc fit |
| 2026-11-01 | Smooth "monotonic BPM drift": +2 when a BPM change follows the set's first drift direction, −3 when it backtracks | ENGINE.md names the preference without numbers |
| 2026-11-01 | Genres: Amapiano and Trance get their own families; unrecognised genres (family "other") score 0.5 like unknown; plain "Techno" maps to Techno (Peak Time / Driving) | Not listed in ENGINE.md families; avoids over-rewarding unknown labels |
| 2026-11-01 | Personal pattern bonus: 🔥 +4, 👌 +1, 👎 −4 per rating, averaged per (key move, BPM bucket ≤1.5/3/5/>5 %), capped ±4 | ENGINE.md gives the cap, not the per-rating values |
| 2026-11-01 | Path finder: exact bounded search (≤ 3 intermediates, layered Dijkstra / meet-in-the-middle) up to 400 tracks; above that first/last hops limited to the 60 cheapest | Exact where testable (brute-force test), fast on 5,000 tracks (~0.3 s) |
| 2026-11-01 | Set generation: beam width 12, 6 children per state, deterministic local improvement (swap, 2-opt, replace) with a sweep cap plus a 300 ms per-mode time fuse; duration window ±5% is hard | Determinism for tests, budget for phones |
| 2026-11-01 | Benchmarks (build container, Node 22): 60-min Journey with 2 locks 32 ms; 40-track organizer, 3 versions 244 ms; 2,000-track fill, 3 versions 204 ms; path on 5,000 tracks 313 ms | Budgets: 300 ms, 1.5 s; a mid phone is slower but has headroom |
| 2026-11-01 | Fuzzy matching: word-level similarity (each word vs closest word, bigram Dice), artist 45% + title 55%, remix-aware (×0.9 one-sided, ×0.75 different remix or strict ownership); threshold 0.8 | Character-only similarity confused "Track K" with "Track Q" |
| 2026-11-01 | Party free text is parsed offline (genres, "no X" exclusions, decades like 2000s / 80s) | Works with zero AI; AI only adds gap suggestions |
| 2026-11-01 | Wheel layout: number n at clock position n (12 at the top), B outer ring, A inner ring; highlights use colour plus a symbol (● selected, ✓ mixes, ⬆ boost) | Readable like a clock; DESIGN.md "colour never alone" |
| 2026-11-01 | Wheel imported eagerly (not lazy) and drawn as plain SVG; measured 19 to 39 ms to open in the e2e test | 150 ms budget, no network |
| 2026-11-01 | Swipe-down to close starts from the header or the dial only | Keeps taps on keys and scrolling of the count list working |
| 2026-11-01 | Effective track values computed once in a LibraryProvider (override > rekordbox > estimate > heuristic) with a source per field; graph cached per library + settings | One source of truth for every tab |
| 2026-11-01 | Organizer always shows the 3 versions (one per mode); the mode chips scroll to a version instead of filtering | PRODUCT.md: "Output: 3 versions side by side, one per mode" |
| 2026-11-01 | "Picked + fill" makes every picked track a must-play; locks (max 3) matter most for "only picked" with a duration, where the engine chooses a subset | Matches "build around" intent; locks stay meaningful in both pools |
| 2026-11-01 | Unmatched lines of a pasted list are saved as wishlist tracks (`local:` ids) with optional manual BPM/key, so they can be used in sets and merge on the next sync | DATA.md: quick-add / wishlist tracks merge on sync |
| 2026-11-01 | Swap replaces the arriving track (or the one before it if locked) with the library track maximising score in + score out; Bridge inserts the best single bridge | PRODUCT.md Swap / Bridge |
| 2026-11-01 | Set editor: grip handle drag (pointer events, keyboard arrows as fallback), swipe left > 110 px removes, visible ✕ as accessible alternative; rescoring runs on every change (< 5 ms for 40 tracks) | DJ-booth touch + accessibility |
| 2026-11-01 | Custom CSS lives in Tailwind `@layer base` / `@layer components` | Unlayered `button { color: inherit }` was overriding every text-colour utility |
| 2026-11-01 | Single precached JS bundle (~160 kB gzip), chunk warning raised to 900 kB | Offline PWA loads everything once; splitting adds requests without benefit |
| 2026-11-01 | Live piano keys: ◀◀ back (undo last play) · ▶ REQUEST · ⇄ bridge finder · ⏏ change track; END session in the session strip | DESIGN.md piano keys (◀◀ · ▶ REQUEST · ⏸ · ⏏) mapped to the Live actions that exist |
| 2026-11-01 | A live session is reused until ended or idle for 4 h; played tracks are excluded from Next | PRODUCT.md "session history kept" |
| 2026-11-01 | Requests not in the library become a virtual track (manual BPM/key/genre, or AI estimate in Phase 6) and get the same 3 blocks via a temporary graph | PRODUCT.md request handler fallback |
| 2026-11-01 | Path "~N tracks" counts intermediates + the request; minutes = intermediates' lengths minus overlaps (4 min if unknown) | ENGINE.md §8 |
| 2026-11-01 | Gig mode follows DESIGN.md (walnut, paper text ≥ 20 px, mustard BPM, no textures, reels only); app header and tab bar hidden, GIG switch stays to exit; Wake Lock re-acquired on visibility change | DESIGN.md wins over PRODUCT.md's "pure black" on theme |
