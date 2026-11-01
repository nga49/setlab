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
