# SETLAB sync (laptop)

Sends your rekordbox library to your private `setlab-data` repo so the phone app sees it.
It only reads rekordbox. It never changes your rekordbox library.

## Install (once)

1. Install **Python 3.11 or newer** from python.org. Tick **Add Python to PATH**.
2. Download the `setlab` repo as a ZIP from GitHub and unzip it.
3. Open the `sync` folder and double-click **install.bat**.
4. Paste **token A** when asked (the text stays hidden) and press Enter.
5. Press Enter to keep the repo name `setlab-data`.
6. Wait for **✅ … tracks synced**.

From then on it runs by itself: when you log in, every 2 hours, and at 23:00.
It only uploads when something changed.

## Everyday use

Add and analyze tracks in rekordbox as usual. Nothing else.

## If rekordbox cannot be read

Newer rekordbox versions sometimes change the database. The tool then uses a rekordbox XML file instead:

1. In rekordbox: **File > Export Collection in xml format**.
2. Save it as `Music\setlab\rekordbox.xml` in your user folder.

## Playlists from the phone (Send to rekordbox)

1. In the app, open a saved set and tap **Send to rekordbox**. Save or send the `setlab-….xml` file to this laptop's **Downloads** folder.
2. Double-click **send_to_rekordbox.bat** (or wait for the next automatic sync).
3. In rekordbox, once: **Preferences > Advanced > Database > rekordbox xml**, choose `Music\setlab\setlab-playlists.xml`. Also turn on **rekordbox xml** under **Preferences > View > Layout** so it shows in the tree.
4. In the tree on the left: **rekordbox xml > Playlists > SETLAB**, right-click your set, **Import Playlist**.

Menu names can differ slightly between rekordbox versions.

## Files

- Settings, token and log: `%APPDATA%\setlab-sync\` (`config.json`, `sync.log`).
- Remove everything: double-click **uninstall.bat**.

## For developers

```
python -m pip install -r requirements-dev.txt
python -m pytest tests
python setlab_sync.py --dry-run --xml tests/fixtures/rekordbox.xml
```
