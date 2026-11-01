# Awesome Mix

Repo and URL name: `setlab`.


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

1. **Font, private (any license)**: on the phone, ⚙️ → **Look** → **Choose font file**. The file stays on that phone (and in its backups). Use this for fonts you are not allowed to share, like the current "Guardians" (All Rights Reserved).
2. **Font, built in (only for fonts whose license allows web use, e.g. OFL)**: replace `public/fonts/title.woff2` and its license file. The repo and site are public, so everyone can download it.
3. **Name**: change `APP_NAME` in `src/config.ts`. Header, page title and PWA manifest follow it. Never change `APP_SLUG`: it names the on-device database and backup files.

Then run `npm run icons` if you also changed the icon, commit and push.
