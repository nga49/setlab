# DESIGN · Look and feel

## 🎨 Design skills to use

Before writing any UI, load these skills with the Skill tool if they are available in your session, and apply them throughout Phases 0, 2, 3, 4 and 8:

| Skill | Use it for |
|---|---|
| `high-end-visual-design` | Overall polish, hierarchy, spacing |
| `design-taste-frontend` | Taste checks on every screen |
| `design-taste-frontend-v1` | Second taste pass, compare and keep the best |
| `gpt-taste` | Final critique before each phase commit |
| `apple-design-motion-web` | Motion: reels, buttons, sheets, transitions |
| `imagegen-frontend-mobile` | Generate mobile screen concepts before building |
| `imagegen-frontend-web` | App icon, splash, textures, marketing-style previews |

If a skill is missing, log it in DECISIONS.md and follow this file. Where a skill conflicts with this file, this file wins on theme, palette and constraints; the skill wins on craft details.

Workflow: generate 2 or 3 concepts for the Live screen with the imagegen skills, pick the best against this brief, log the choice, then build. Screenshot each tab at 390×844 at the end of each UI phase and run a taste pass before committing.

---

## 📼 Direction: retro portable tape deck (chosen by Nico)

The app feels like a late 70s / early 80s portable cassette player and hi-fi deck, reimagined for a phone. Warm, tactile, a little nostalgic, fun to touch, still fast and readable behind the decks.

Originality rule: this is a generic retro tape-deck aesthetic. Do not copy any existing album cover, film prop, soundtrack artwork or brand (no film titles, logos or lettering from any franchise). All artwork, labels and lettering must be original.

### Palette
| Token | Value | Use |
|---|---|---|
| walnut | #2B1D14 | App background (dark wood) |
| walnut-2 | #3A281C | Raised panels |
| aluminium | #C9C2B4 | Deck faceplate, piano keys |
| aluminium-dark | #8A8274 | Key shadows, borders |
| paper | #F2E3C6 | Labels, cards, text on dark |
| mustard | #E8A33D | Primary accent, BPM, highlights |
| rust | #B5462A | Main action (REQUEST, BUILD), warnings |
| teal | #1E3D3A · light #8FC1B5 | Tape window, info, AI badge |
| olive | #5E8C61 | Good transition |
| good / ok / bad | #5E8C61 · #E8A33D · #B5462A | Transition dots (always with a symbol) |

Camelot key chips keep their own wheel colours (see ENGINE.md) but are shown as small rectangular "tape counter" tags.

### Type
- **Title font and app name: provided by Nico later.** Build with a placeholder and make both swappable in one place:
  - Title font: one CSS variable `--font-title` and one `@font-face` in `src/styles/fonts.css`, loading `public/fonts/title.woff2` if it exists, else the placeholder **Bungee** (open licence, self-hosted). Nico will drop his own file into `public/fonts/` later.
  - App name: `APP_NAME` in `src/config.ts` (placeholder "SETLAB"), used everywhere: header, PWA manifest, icon text, page title.
  - Add a short section "Change title font or app name" to README.md with the exact 2 steps.
- Title font is used only for screen titles and the app name
- Data: a typewriter / mono face (e.g. Space Mono) for BPM, keys, scores, labels
- Handwritten marker face (open licence) only for set names written on tape labels
- Self-host all fonts (offline)

### Signature components
- 📼 **Tape window** (Now playing): two reels that spin while a track plays or while a set is generating (speed follows BPM); the track name sits between them on a teal panel
- 🎹 **Piano-key buttons**: aluminium keys that press down 2 px with a darker bottom edge (◀◀ BEFORE · ▶ REQUEST · ⏸ · ⏏)
- 📈 **VU meter**: needle or segmented LED bar for energy; set score shown on a small analogue meter
- 🔢 **Tape counter**: mechanical-looking 3-digit counter for duration and track numbers
- 🏷️ **Tape labels**: each saved set is a cassette in a rack with an original handwritten paper label (set name, date, mode)
- 🗂️ **Tape rack**: saved sets screen looks like a shelf of cassettes, newest first
- 🎡 **Camelot wheel**: drawn as a rotary dial / volume knob with notches, same 24 segments and highlights as PRODUCT.md
- Lists as "track list on the tape card": numbered rows `01 · Track`, dashed dividers

### Texture and motion
- Subtle wood grain and paper grain (very light, generated or CSS), brushed metal on the faceplate
- Motion via `apple-design-motion-web`: springy key presses, reels with inertia, sheet slides like a tape door opening
- Optional click sounds on key presses (off by default, toggle in Settings)
- Respect `prefers-reduced-motion`: reels static, no grain animation

### Gig mode (booth)
Same theme, stripped down: walnut background, paper text ≥ 20 px, mustard BPM, no textures, no animation except a slow reel, wake lock on. Nothing pure white.

## Phone and booth rules
- Design for 390×844 first; 360 px to tablet
- Tap targets ≥ 48 px (Live tab ≥ 56 px), bottom tab bar, safe areas
- Contrast AA minimum on every text, including on paper and aluminium
- Colour never alone: every status has a symbol or text
- Empty states say what to do next
- Very little text: chips, numbers, icons. Nico wants visual over text

## App icon and splash
Original cassette-reel icon in mustard and walnut, generated with `imagegen-frontend-web`, exported to all PWA sizes. Splash: walnut background with the spinning-reel icon.

## PWA
Name from `APP_NAME`, theme #2B1D14, display standalone, portrait. Install hint banner on first mobile visit.
