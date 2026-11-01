# 🙋 HUMAN TASKS · only what Claude Code can't do

## 📍 Status (updated by Claude Code · 2026-11-01)

| | |
|---|---|
| 🌐 App URL | **https://nga49.github.io/setlab/** · live |
| ✅ Built and tested | Sets (organizer, 3 versions, editor, party sets, tape rack) · Live (now playing, next 5, request, path, bridge, gig mode) · Camelot wheel · Library (5,000-track list, filters, edits, quick-add, insights, gap finder) · Practice (history, ratings, exports) · Settings (sync, AI, backup) · offline PWA |
| 🔵 Library sync | Ready: laptop tool in `sync/` (rekordbox 6/7 via pyrekordbox 0.5, XML fallback). Needs steps C to F |
| 🟣 AI | Ready: estimates, missing tracks finder, gap picks, mixing tips. Needs a Claude API key (step H). Without it everything else works |
| 🎧 Spotify | Not built: Spotify's 2026 Development Mode rules (Premium owner, endpoint changes) could not be verified. Missing tracks use web search instead |
| ⏭️ Your next step | Step F below (A to E done) |

### Your steps, in order

| # | Where | Do this |
|---|---|---|
| A | 💻 github.com → repo **setlab** | Merge the branch `claude/autonomous-project-build-8wbcju` into `main` (Pull requests → New → base `main`, compare that branch → Merge). Or ask Claude Code to open the pull request |
| B | 💻 setlab → Settings → Pages | Source: **GitHub Actions**. If you do this after A, open Actions → "CI and deploy" → Re-run. The app appears at the URL above |
| C | 💻 github.com | New **private** repo **setlab-data** (tick "Add a README") |
| D | 💻 GitHub → Settings → Developer settings → Fine-grained tokens | **Token A**: only `setlab-data`, Contents **Read and write**, 1 year. **Token B**: only `setlab-data`, Contents **Read-only**, 1 year |
| E | 💻 Laptop | Install Python 3.11+ (python.org, tick "Add Python to PATH"). Open rekordbox once |
| F | 💻 Laptop | Download `setlab` as ZIP → unzip → `sync`. If Windows blocks install.bat: address bar → `powershell` → `Get-ChildItem -Recurse \| Unblock-File`. Double-click **install.bat** → paste token A (it stays invisible, that is normal) → Enter → wait for "✅ … tracks synced" |
| G | 📱 Phone | Open the app URL → Share → **Add to Home Screen** → ⚙️ → Library sync → `nga49/setlab-data` + token B → **Test connection** |
| H | 📱 Phone, optional | console.anthropic.com → API key → app ⚙️ → AI (budget €5/month by default) |

---

## 🟢 Before the build · 5 min

| # | Where | Do this | Why |
|---|---|---|---|
| 1 | 💻 github.com | New repo **setlab** · Private or Public · empty | App code lives here |
| 2 | 💻 github.com | Upload all files of this folder (drag and drop) · Commit | Gives Claude Code the plan |
| 3 | 📱 Claude Code | New session on repo **setlab** · paste the Build prompt from `START_HERE.md` | Starts the autonomous build |

⚠️ GitHub Pages on a **private** repo needs a paid GitHub plan. Free plan → make **setlab** public. Your library stays private anyway (separate repo, step 4).

---

## 🔵 During or after the build · 10 min

| # | Where | Do this | Why |
|---|---|---|---|
| 4 | 💻 github.com | If Claude Code couldn't: new **private** repo **setlab-data** | Your library lives here, private |
| 5 | 💻 GitHub → Settings → Developer settings → Fine-grained tokens | Token **A** · repo `setlab-data` only · Contents: **Read and write** · 1 year | Laptop pushes your library |
| 6 | same | Token **B** · repo `setlab-data` only · Contents: **Read-only** · 1 year | Phone reads your library |
| 7 | 💻 github.com → setlab → Settings → Pages | Source: **GitHub Actions** (if not already on) | Puts the app online |

🔐 Never paste tokens or keys in a chat. Only in the installer (laptop) or the app Settings (phone).

---

## 🟣 Laptop setup · once · 10 min

| # | Do this |
|---|---|
| 8 | Install **Python 3.11+** from python.org · tick ✅ "Add Python to PATH" |
| 9 | Download the **setlab** repo as ZIP · unzip · open folder `sync` |
| 10 | Double-click **install.bat** · paste token **A** when asked (nothing appears, that is normal) · press Enter. Blocked by Smart App Control? See `sync/README.md` step 3 |
| 11 | Wait for "✅ tracks synced" |

Then it runs by itself: at logon, every 2 h, and at 23:00. 🎧 Add and analyze tracks in rekordbox as usual, nothing else.

---

## 📱 Phone setup · once · 3 min

| # | Do this |
|---|---|
| 12 | Open the app URL in Safari / Chrome · Share → **Add to Home Screen** |
| 13 | App ⚙️ Settings → Library sync → `your-username/setlab-data` + token **B** → Test |
| 14 | 🟣 Optional: console.anthropic.com → API key → app ⚙️ Settings → AI · set budget (default €5/month) |

Without step 14: wheel, organizer, live, library all work. Only AI search and estimates are off.

---

## ⚪ Optional

| # | Do this | Only if |
|---|---|---|
| 15 | Spotify: not available for now (see status) | Spotify developer rules change |
| 16 | Send a set to rekordbox: see "🎚️ rekordbox playlists" below | When you want a set in rekordbox |
| 17 | Give Claude Code your title font file + app name: "Add this font as the title font and rename the app to …" | When you're ready |

---

## 🤖 Added by Claude Code

| # | Where | Do this | Why |
|---|---|---|---|
| 18 | 💻 github.com | Merge the build branch into `main` (step A) | Deploy runs only from `main` |
| 19 | 💻 rekordbox, once | Preferences → View → Layout: tick **rekordbox xml**. Preferences → Advanced → Database → rekordbox xml: choose `Music\setlab\setlab-playlists.xml` | Lets rekordbox see the playlists sent from the phone |
| 20 | 🌐 Claude Code network settings, optional | Allow `pyrekordbox.readthedocs.io`, `docs.github.com` and `developer.spotify.com` for future build sessions | They were blocked during the build; checks were done from package source and the live API instead |

### 🎚️ rekordbox playlists (Send to rekordbox)

| # | Do this |
|---|---|
| 1 | 📱 App → saved set → **Export** → **Send to rekordbox (XML)** → save or send the file to the laptop's **Downloads** folder |
| 2 | 💻 Double-click `sync\send_to_rekordbox.bat` (or wait for the next automatic sync) |
| 3 | 💻 rekordbox: tree on the left → **rekordbox xml** → **SETLAB** → right-click your set → **Import Playlist** |

Menu names can differ slightly between rekordbox versions.
