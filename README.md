# SETLAB

Personal DJ set organizer PWA. 👉 Start with `START_HERE.md`. Claude Code: read `CLAUDE.md`.

## Develop

```
npm install
npm run dev        # http://localhost:5173/setlab/
npm test           # unit tests (Vitest)
npm run build      # typecheck + production build
npm run e2e        # Playwright mobile smoke test (390x844)
```

Pushes to `main` run the tests and deploy to GitHub Pages (`.github/workflows/ci.yml`).

## Change title font or app name

1. **Font**: put your font file at `public/fonts/title.woff2` (replace the existing file; convert to WOFF2 first if needed). It is used for screen titles and the app name only.
2. **Name**: change `APP_NAME` in `src/config.ts`. Header, page title and PWA manifest follow it.

Then run `npm run icons` if you also changed the icon, commit and push.
