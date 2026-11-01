# SETLAB

Personal DJ set organizer PWA (phone first, works offline). 👉 Start with `START_HERE.md` and `HUMAN_TASKS.md`. Claude Code: read `CLAUDE.md`.

- **Sets**: organizer with 3 versions (Smooth, Journey, Key tour), locks, pins, duration fit, editor, party sets, tape rack
- **Live**: now playing, best next tracks, request handler with path, bridge finder, gig mode
- **Library**: synced rekordbox library, filters, edits, quick-add, insights, gap finder, missing tracks (AI)
- **Practice**: session history, transition ratings, export to rekordbox / text / M3U
- Engine: `src/engine` (pure TypeScript, tested). Laptop sync tool: `sync/`. Specs: `docs/`. Choices: `DECISIONS.md`.

## Develop

```
npm install
npm run dev        # http://localhost:5173/setlab/
npm test           # unit tests (Vitest)
npm run build      # typecheck + production build
npm run e2e        # Playwright mobile tests (390x844)
```

Pushes to `main` run the tests and deploy to GitHub Pages (`.github/workflows/ci.yml`).

## Change title font or app name

1. **Font**: put your font file at `public/fonts/title.woff2` (replace the existing file; convert to WOFF2 first if needed). It is used for screen titles and the app name only.
2. **Name**: change `APP_NAME` in `src/config.ts`. Header, page title and PWA manifest follow it.

Then run `npm run icons` if you also changed the icon, commit and push.
