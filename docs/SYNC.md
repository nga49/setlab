# SYNC · rekordbox → phone, automatically

Goal: Nico never exports anything by hand. After he adds and analyzes tracks in rekordbox, the phone sees them.

```
💻 rekordbox (master.db) → 🐍 setlab-sync (Windows, scheduled) → ☁️ private repo setlab-data/tracks.json → 📱 app fetch (pull-to-refresh + on open)
```

## 1. Where the code lives
`/sync` folder in this repo:
- `setlab_sync.py` main script
- `camelot.py` (same key table as `src/engine/camelot.ts`; add a test that both tables agree, e.g. a shared `keys.json` generated or checked in CI)
- `requirements.txt` (pyrekordbox, requests)
- `install.bat` one double-click installer for Windows
- `uninstall.bat`
- `README.md` with screenshots-free, numbered, plain steps
- `tests/` with a fake XML and a mocked DB layer

## 2. Behaviour of `setlab_sync.py`
1. Load config from `%APPDATA%\setlab-sync\config.json` (data repo owner/name, GitHub token with write access to that repo only, mode, xml fallback path). Never print the token.
2. **Primary**: read rekordbox `master.db` via pyrekordbox (read-only). Verify current pyrekordbox docs for rekordbox 6/7 support and any key-download step needed for newer versions; implement it inside the installer if possible.
3. **Fallback**: if DB read fails, look for the newest rekordbox XML at the configured path (default `%USERPROFILE%\Music\setlab\rekordbox.xml`) and parse it. Log which source was used.
4. Build `tracks.json` per `DATA.md`. Skip tracks with no title. Compute Camelot.
5. Compare with the last pushed hash (stored locally). If unchanged, exit quietly.
6. Push via GitHub REST API (contents endpoint: create/update file with sha) to the private data repo. Commit message `sync: 1248 tracks (+12)`.
7. Write a log to `%APPDATA%\setlab-sync\sync.log` (rotate at 1 MB). Exit code non-zero on failure.
8. Optional Windows toast notification on error only (skip if it needs extra heavy dependencies).

## 3. Scheduling (done by `install.bat`, not by Nico)
- Check Python 3.11+ is installed; if not, print the exact winget command and stop with a clear message (this is a human task).
- Create a venv in `%APPDATA%\setlab-sync\venv`, install requirements.
- Ask in the console for: GitHub token (hidden input), data repo name (default `setlab-data`). Save config.
- Register Windows Task Scheduler tasks: at logon + every 2 hours + daily 23:00, run hidden (`pythonw`). Use `schtasks` so no admin rights are needed if possible.
  - **Changed 2026-11-01 at Nico's request:** a hidden background watcher (`setlab_sync.py --watch`, started at logon by a Startup shortcut) syncs each time rekordbox closes, plus once at logon. The timed tasks are removed on install. See DECISIONS.md.
- Run one sync immediately and print "✅ 1248 tracks synced" or the error with the fix.

## 4. App side
- Settings: data repo `owner/setlab-data`, read-only fine-grained token (Contents: read, only that repo). "Test connection".
- Fetch `tracks.json` via GitHub API (raw media type) on app open (if last fetch > 30 min) and on pull-to-refresh. Use ETag to avoid re-downloading.
- Offline: use last cached data.
- Merge per `DATA.md`.

## 5. What Claude Code can and cannot do here
- ✅ Write, test (with fixtures) and document everything above.
- ✅ Create the private `setlab-data` repo if your session has GitHub permissions for it; otherwise add it to HUMAN_TASKS.
- ❌ Cannot run anything on Nico's laptop: installing Python and double-clicking `install.bat` are human tasks.
- ❌ Cannot create GitHub tokens: human task, with exact click path in HUMAN_TASKS.
