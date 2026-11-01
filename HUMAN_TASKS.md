# 🙋 HUMAN TASKS · only what Claude Code can't do

## 📍 Status (Claude Code updates this at the end)

| | |
|---|---|
| 🌐 App URL | _not live yet_ |
| ✅ Live features | _none yet_ |
| ⏭️ Your next step | Step 1 below |

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
| 10 | Double-click **install.bat** · paste token **A** when asked · press Enter |
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
| 15 | Spotify developer app (steps added below by Claude Code) | Claude Code confirms Spotify works |
| 16 | rekordbox: File → Import → playlist XML from the app | When you want a set in rekordbox |
| 17 | Give Claude Code your title font file + app name: "Add this font as the title font and rename the app to …" | When you're ready |

---

## 🤖 Added by Claude Code

_(Claude Code appends new human steps here, same format)_
