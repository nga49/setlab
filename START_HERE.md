# ▶️ START HERE

🙋 = you · 🤖 = Claude Code

## 1️⃣ Launch the build · 10 min

| # | Who | Do this |
|---|---|---|
| 1 | 🙋 | Unzip `setlab.zip` (phone: tap it in the Files app) |
| 2 | 🙋 | github.com → **New repository** → name `setlab` → **Public** → ✅ Add a README → Create |
| 3 | 🙋 | In the repo: **Add file → Upload files** → select everything **inside** the `setlab` folder (keep the `docs` folder) → **Commit** |
| 4 | 🙋 | Claude Code → new session → choose repo **setlab** |
| 5 | 🙋 | Paste the **Build prompt** below → send |
| 6 | 🤖 | Builds all 9 phases, tests, commits, pushes, deploys |

## 2️⃣ While it builds · 10 min · any time

| # | Who | Do this |
|---|---|---|
| 7 | 🙋 | github.com → New repository → `setlab-data` → **Private** → Create |
| 8 | 🙋 | GitHub → Settings → Developer settings → Fine-grained tokens → **Token A**: repo `setlab-data` only · Contents **Read and write** · 1 year → copy it to your notes app |
| 9 | 🙋 | Same → **Token B**: repo `setlab-data` only · Contents **Read-only** · 1 year → copy it |
| 10 | 🙋 | Repo `setlab` → Settings → Pages → Source: **GitHub Actions** |

## 3️⃣ When Claude Code says it's done

| # | Who | Do this |
|---|---|---|
| 11 | 🙋 | Open `HUMAN_TASKS.md` in the repo → status block shows the app URL and anything new for you |
| 12 | 🙋 | 💻 Laptop: install Python 3.11+ (python.org, ✅ "Add to PATH") |
| 13 | 🙋 | 💻 Download repo `setlab` as ZIP → unzip → folder `sync` → double-click **install.bat** → paste **Token A** |
| 14 | 🙋 | 📱 Open the app URL → Share → **Add to Home Screen** |
| 15 | 🙋 | 📱 App ⚙️ → Library sync → `your-username/setlab-data` + **Token B** → Test |
| 16 | 🙋 | 🟣 Optional: Claude API key → app ⚙️ → AI |

🎧 After that: add and analyze tracks in rekordbox as usual. Everything else is automatic.

🔐 Tokens and keys go only into the installer or the app Settings. Never into a chat.

---

## 📋 Build prompt

```
Build this whole project autonomously.

Read CLAUDE.md first, then every file in /docs. Load the design skills listed in docs/DESIGN.md if they are available. Follow docs/PHASES.md from Phase 0 to Phase 8 without stopping to ask me anything. When something is unclear, decide, log it in DECISIONS.md and continue. Verify every external API in its current official docs before using it.

Commit and push after each phase. If something truly needs me (accounts, tokens, settings only I can change, my laptop, my phone), add it to HUMAN_TASKS.md and keep building everything else.

When finished, update the status block at the top of HUMAN_TASKS.md with the live URL and my remaining steps in order, then give me a short summary.
```

## 🔁 If the session stops before the end

New session on **setlab**, paste:

```
Continue the build. Read CLAUDE.md, DECISIONS.md and docs/PHASES.md, find the first unchecked box, and continue autonomously to the end.
```

## 🎨 Later: your title font and app name

New session on **setlab**, attach your font file, paste:

```
Add the attached font as the title font (public/fonts/title.woff2, convert if needed) and rename the app to "<your name>". Follow the README section "Change title font or app name". Commit, push, deploy.
```
