"""
SETLAB sync: rekordbox -> private GitHub data repo (tracks.json).

Runs on Nico's Windows laptop (scheduled by install.bat). Reads the rekordbox
library read-only with pyrekordbox (master.db), or a rekordbox XML export as a
fallback, builds tracks.json (docs/DATA.md) and pushes it to the private data
repo through the GitHub REST contents API. Only pushes when the data changed.

Usage:
  python setlab_sync.py                 sync once (what the scheduled task runs)
  python setlab_sync.py --setup         ask for the token and data repo, save config
  python setlab_sync.py --install-schedule   register logon / every 2 h / 23:00 runs
  python setlab_sync.py --remove-schedule    remove them
  python setlab_sync.py --xml FILE      use this rekordbox XML instead of master.db
  python setlab_sync.py --dry-run       build tracks.json next to the config, do not push
  python setlab_sync.py --playlists [FILES]  turn playlists exported by the phone into
                                        a rekordbox XML with file locations

The token is never printed or logged.
"""
from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import json
import logging
import logging.handlers
import os
import re
import subprocess
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from camelot import parse_key

SCHEMA = 1
APP_DIR_NAME = "setlab-sync"
TRACKS_PATH = "tracks.json"
API = "https://api.github.com"
API_VERSION = "2022-11-28"
TASK_NAMES = ("SETLAB sync (every 2 hours)", "SETLAB sync (23:00)")
STARTUP_LINK = "SETLAB sync.lnk"

log = logging.getLogger("setlab_sync")


# ---------------------------------------------------------------------------
# Paths and config


def app_dir() -> Path:
    base = os.environ.get("APPDATA") or str(Path.home() / ".config")
    d = Path(base) / APP_DIR_NAME
    d.mkdir(parents=True, exist_ok=True)
    return d


def default_xml_path() -> Path:
    return Path(os.environ.get("USERPROFILE", str(Path.home()))) / "Music" / "setlab" / "rekordbox.xml"


def downloads_dir() -> Path:
    return Path(os.environ.get("USERPROFILE", str(Path.home()))) / "Downloads"


@dataclass
class Config:
    repo: str = ""  # "owner/setlab-data"
    token: str = ""
    mode: str = "auto"  # auto | db | xml
    xml_path: str = ""
    branch: str = ""

    @classmethod
    def load(cls, path: Path) -> "Config":
        if not path.exists():
            return cls()
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    def save(self, path: Path) -> None:
        path.write_text(json.dumps(self.__dict__, indent=2), encoding="utf-8")


def setup_logging(to_file: bool = True) -> None:
    log.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    if to_file:
        h = logging.handlers.RotatingFileHandler(app_dir() / "sync.log", maxBytes=1_000_000, backupCount=2, encoding="utf-8")
        h.setFormatter(fmt)
        log.addHandler(h)
    if sys.stdout is not None:
        s = logging.StreamHandler(sys.stdout)
        s.setFormatter(logging.Formatter("%(message)s"))
        log.addHandler(s)


# ---------------------------------------------------------------------------
# Track building (shared by DB and XML sources)

_REMIX = re.compile(
    r"^(.*?)\s*[\(\[]([^\)\]]*\b(?:remix|mix|edit|dub|rework|version|vip|bootleg|refix|flip)\b[^\)\]]*)[\)\]]\s*$",
    re.I,
)
_PLAIN_MIX = re.compile(r"^(original|extended|radio|club|album)\s+(mix|edit|version)$", re.I)


def split_remix(title: str) -> tuple[str, str | None]:
    """'Track (Someone Remix)' -> ('Track', 'Someone Remix'). '(Original Mix)' is not a remix."""
    m = _REMIX.match(title or "")
    if not m:
        return (title or "").strip(), None
    remix = m.group(2).strip()
    if _PLAIN_MIX.match(remix):
        return m.group(1).strip(), None
    return m.group(1).strip(), remix


def norm_bpm(v: Any) -> float | None:
    """master.db stores BPM as an integer x100 (12800 = 128.00); XML stores a float."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if f <= 0:
        return None
    if f > 1000:
        f = f / 100.0
    return round(f, 2)


def norm_rating(v: Any) -> int:
    """0..5 stars. XML uses 0/51/102/153/204/255."""
    try:
        r = int(v or 0)
    except (TypeError, ValueError):
        return 0
    if r > 5:
        r = round(r / 51)
    return max(0, min(5, r))


def norm_year(v: Any) -> int | None:
    try:
        y = int(str(v)[:4])
    except (TypeError, ValueError):
        return None
    return y if 1900 <= y <= 2100 else None


def norm_date(v: Any) -> str | None:
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    s = str(v).strip()
    m = re.match(r"(\d{4})[-/](\d{1,2})[-/](\d{1,2})", s)
    if m:
        return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    return None


def clean(v: Any) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def make_track(
    rb_id: Any,
    title: Any,
    artist: Any,
    *,
    album: Any = None,
    label: Any = None,
    genre: Any = None,
    bpm: Any = None,
    key_raw: Any = None,
    length: Any = None,
    year: Any = None,
    rating: Any = None,
    comment: Any = None,
    date_added: Any = None,
    remixer: Any = None,
    mix: Any = None,
    playlists: Iterable[str] = (),
    my_tag: Iterable[str] = (),
) -> dict | None:
    """One tracks.json entry (docs/DATA.md §1). Returns None for tracks with no title."""
    t = clean(title)
    if not t:
        return None
    base_title, remix = split_remix(t)
    if not remix:
        m = clean(mix)
        if m and not _PLAIN_MIX.match(m):
            remix = m
        elif clean(remixer):
            remix = f"{clean(remixer)} Remix"
    key = clean(key_raw)
    try:
        length_sec = int(float(length)) if length not in (None, "") else None
    except (TypeError, ValueError):
        length_sec = None
    return {
        "id": f"rb:{rb_id}",
        "artist": clean(artist) or "",
        "title": base_title,
        "remix": remix,
        "album": clean(album),
        "label": clean(label),
        "genre": clean(genre),
        "bpm": norm_bpm(bpm),
        "keyRaw": key,
        "camelot": parse_key(key),
        "lengthSec": length_sec if length_sec and length_sec > 0 else None,
        "year": norm_year(year),
        "rating": norm_rating(rating),
        "comment": clean(comment),
        "dateAdded": norm_date(date_added),
        "playlists": sorted({p for p in playlists if p}),
        "myTag": sorted({m for m in my_tag if m}),
    }


# ---------------------------------------------------------------------------
# Source 1: rekordbox master.db via pyrekordbox (read-only)


def read_from_db(db: Any = None) -> tuple[list[dict], str]:
    """Read tracks from master.db. `db` can be injected (tests use a fake)."""
    version = ""
    if db is None:
        from pyrekordbox import MasterDatabase  # imported lazily: tests do not need it

        db = MasterDatabase()
        try:
            from pyrekordbox import get_config

            version = (get_config("rekordbox7") or get_config("rekordbox6") or {}).get("version", "")
        except Exception:  # pragma: no cover - informational only
            version = ""

    playlists: dict[str, set[str]] = {}
    for pl in db.get_playlist():
        if getattr(pl, "Attribute", 0) != 0 or getattr(pl, "rb_local_deleted", 0):
            continue  # folders and smart playlists are skipped
        for song in getattr(pl, "Songs", []) or []:
            playlists.setdefault(str(song.ContentID), set()).add(pl.Name)

    tracks: list[dict] = []
    for c in db.get_content():
        if getattr(c, "rb_local_deleted", 0):
            continue
        cid = str(c.ID)
        t = make_track(
            cid,
            c.Title,
            getattr(c, "ArtistName", None),
            album=getattr(c, "AlbumName", None),
            label=getattr(c, "LabelName", None),
            genre=getattr(c, "GenreName", None),
            bpm=getattr(c, "BPM", None),
            key_raw=getattr(c, "KeyName", None),
            length=getattr(c, "Length", None),
            year=getattr(c, "ReleaseYear", None),
            rating=getattr(c, "Rating", None),
            comment=getattr(c, "Commnt", None),
            date_added=getattr(c, "StockDate", None) or getattr(c, "DateCreated", None) or getattr(c, "created_at", None),
            remixer=getattr(c, "RemixerName", None),
            playlists=playlists.get(cid, ()),
            my_tag=list(getattr(c, "MyTagNames", None) or []),
        )
        if t:
            tracks.append(t)
    return tracks, str(version or "")


# ---------------------------------------------------------------------------
# Source 2: rekordbox XML export (fallback)


def read_from_xml(path: Path) -> tuple[list[dict], str]:
    root = ET.parse(path).getroot()
    product = root.find("PRODUCT")
    version = product.get("Version", "") if product is not None else ""
    coll = root.find("COLLECTION")
    if coll is None:
        raise ValueError("Not a rekordbox XML file (no COLLECTION)")
    by_location: dict[str, str] = {}
    raw: list[ET.Element] = list(coll.findall("TRACK"))
    for el in raw:
        if el.get("Location"):
            by_location[el.get("Location", "")] = el.get("TrackID", "")
    playlists: dict[str, set[str]] = {}

    def walk(node: ET.Element) -> None:
        for child in node.findall("NODE"):
            if child.get("Type") == "1":
                key_type = child.get("KeyType", "0")
                for t in child.findall("TRACK"):
                    k = t.get("Key", "")
                    tid = k if key_type == "0" else by_location.get(k, "")
                    if tid:
                        playlists.setdefault(tid, set()).add(child.get("Name", ""))
            else:
                walk(child)

    pls = root.find("PLAYLISTS")
    if pls is not None:
        walk(pls)
    tracks = []
    for el in raw:
        tid = el.get("TrackID", "")
        t = make_track(
            tid,
            el.get("Name"),
            el.get("Artist"),
            album=el.get("Album"),
            label=el.get("Label"),
            genre=el.get("Genre"),
            bpm=el.get("AverageBpm"),
            key_raw=el.get("Tonality"),
            length=el.get("TotalTime"),
            year=el.get("Year"),
            rating=el.get("Rating"),
            comment=el.get("Comments"),
            date_added=el.get("DateAdded"),
            remixer=el.get("Remixer"),
            mix=el.get("Mix"),
            playlists=playlists.get(tid, ()),
        )
        if t:
            tracks.append(t)
    return tracks, version


# ---------------------------------------------------------------------------
# tracks.json


def build_payload(tracks: list[dict], source: str, version: str) -> dict:
    tracks = sorted(tracks, key=lambda t: t["id"])
    return {
        "schema": SCHEMA,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": source,
        "rekordboxVersion": version,
        "count": len(tracks),
        "tracks": tracks,
    }


def content_hash(payload: dict) -> str:
    """Hash of the track data only (generatedAt excluded) to detect real changes."""
    body = json.dumps(payload["tracks"], sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def serialize(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


# ---------------------------------------------------------------------------
# GitHub push


class GitHubError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def explain(status: int) -> str:
    if status == 401:
        return "Token rejected (expired or wrong). Create a new token A and run install.bat again."
    if status == 403:
        return "Token has no write access. Token A needs Contents: Read and write on the data repo."
    if status == 404:
        return "Data repo not found. Check the name, and that token A has access to it."
    if status in (409, 422):
        return "The file changed on GitHub meanwhile. It will retry on the next run."
    return f"GitHub error {status}."


class GitHub:
    def __init__(self, token: str, repo: str, session: Any = None):
        import requests  # imported lazily so the module loads without it

        self.repo = repo
        self.s = session or requests.Session()
        self.s.headers.update(
            {"Authorization": f"Bearer {token}", "X-GitHub-Api-Version": API_VERSION, "User-Agent": "setlab-sync"}
        )

    def _url(self, path: str) -> str:
        return f"{API}/repos/{self.repo}/contents/{urllib.parse.quote(path)}"

    def check(self) -> None:
        r = self.s.get(f"{API}/repos/{self.repo}", timeout=30)
        if r.status_code != 200:
            raise GitHubError(r.status_code, explain(r.status_code))

    def get_sha(self, path: str) -> str | None:
        # The object media type returns metadata (sha) for files up to 100 MB.
        r = self.s.get(self._url(path), headers={"Accept": "application/vnd.github.object+json"}, timeout=60)
        if r.status_code == 404:
            return None
        if r.status_code != 200:
            raise GitHubError(r.status_code, explain(r.status_code))
        return r.json().get("sha")

    def put(self, path: str, content: bytes, message: str, sha: str | None) -> str:
        body: dict[str, Any] = {"message": message, "content": base64.b64encode(content).decode("ascii")}
        if sha:
            body["sha"] = sha
        r = self.s.put(self._url(path), json=body, headers={"Accept": "application/vnd.github+json"}, timeout=120)
        if r.status_code not in (200, 201):
            raise GitHubError(r.status_code, explain(r.status_code))
        return r.json().get("content", {}).get("sha", "")


# ---------------------------------------------------------------------------
# Sync


@dataclass
class State:
    hash: str = ""
    count: int = 0
    sha: str = ""
    ids: list[str] = field(default_factory=list)

    @classmethod
    def load(cls, path: Path) -> "State":
        if not path.exists():
            return cls()
        try:
            return cls(**json.loads(path.read_text(encoding="utf-8")))
        except Exception:
            return cls()

    def save(self, path: Path) -> None:
        path.write_text(json.dumps(self.__dict__), encoding="utf-8")


def read_library(cfg: Config, xml_override: Path | None = None, db: Any = None) -> tuple[list[dict], str, str]:
    """Primary: master.db. Fallback: newest rekordbox XML. Returns (tracks, source, version)."""
    if xml_override:
        tracks, version = read_from_xml(xml_override)
        return tracks, "rekordbox-xml", version
    if cfg.mode in ("auto", "db"):
        try:
            tracks, version = read_from_db(db)
            log.info("Source: rekordbox master.db (%d tracks)", len(tracks))
            return tracks, "pyrekordbox", version
        except Exception as e:  # DB locked, missing sqlcipher, unsupported version...
            if cfg.mode == "db":
                raise
            log.warning("master.db not readable (%s). Trying the XML fallback.", type(e).__name__)
    xml_path = Path(cfg.xml_path) if cfg.xml_path else default_xml_path()
    if not xml_path.exists():
        raise FileNotFoundError(
            f"No rekordbox XML at {xml_path}. In rekordbox: File > Export Collection in xml format, save it there."
        )
    tracks, version = read_from_xml(xml_path)
    log.info("Source: rekordbox XML %s (%d tracks)", xml_path, len(tracks))
    return tracks, "rekordbox-xml", version


def sync(cfg: Config, *, xml_override: Path | None = None, dry_run: bool = False, db: Any = None, github: Any = None) -> str:
    """Run one sync. Returns a short report. Raises on failure."""
    state_path = app_dir() / "state.json"
    state = State.load(state_path)
    tracks, source, version = read_library(cfg, xml_override, db)
    payload = build_payload(tracks, source, version)
    h = content_hash(payload)
    ids = [t["id"] for t in payload["tracks"]]
    added = len(set(ids) - set(state.ids)) if state.ids else len(ids)
    removed = len(set(state.ids) - set(ids)) if state.ids else 0
    if dry_run:
        out = app_dir() / TRACKS_PATH
        out.write_bytes(serialize(payload))
        return f"Dry run: {len(ids)} tracks written to {out}"
    if h == state.hash:
        return f"No change ({len(ids)} tracks)"
    if not cfg.repo or not cfg.token:
        raise RuntimeError("Not set up yet. Run install.bat (or setlab_sync.py --setup).")
    gh = github or GitHub(cfg.token, cfg.repo)
    msg = f"sync: {len(ids)} tracks (+{added})" + (f" (-{removed})" if removed else "")
    try:
        sha = gh.put(TRACKS_PATH, serialize(payload), msg, state.sha or gh.get_sha(TRACKS_PATH))
    except GitHubError as e:
        if e.status not in (409, 422):
            raise
        sha = gh.put(TRACKS_PATH, serialize(payload), msg, gh.get_sha(TRACKS_PATH))
    State(hash=h, count=len(ids), sha=sha, ids=ids).save(state_path)
    return f"{len(ids)} tracks synced (+{added}, -{removed})"


# ---------------------------------------------------------------------------
# Phone playlists -> rekordbox XML with file locations


def _db_locations(db: Any = None) -> dict[str, dict]:
    """rb content id -> {"path": file path, ...} from master.db (file paths never leave the laptop)."""
    if db is None:
        from pyrekordbox import MasterDatabase

        db = MasterDatabase()
    out = {}
    for c in db.get_content():
        path = getattr(c, "FolderPath", None)
        if path:
            out[str(c.ID)] = {"path": path, "title": c.Title, "artist": getattr(c, "ArtistName", "") or ""}
    return out


def _xml_locations(path: Path) -> dict[str, dict]:
    root = ET.parse(path).getroot()
    out = {}
    for el in root.iter("TRACK"):
        if el.get("TrackID") and el.get("Location"):
            loc = urllib.parse.unquote(el.get("Location", "").replace("file://localhost/", ""))
            out[el.get("TrackID", "")] = {"path": loc, "title": el.get("Name", ""), "artist": el.get("Artist", "")}
    return out


def encode_location(path: str) -> str:
    p = path.replace("\\", "/")
    return "file://localhost/" + urllib.parse.quote(p, safe="/:")


def resolve_playlists(files: list[Path], locations: dict[str, dict], out_path: Path) -> tuple[int, int]:
    """Merge phone-exported playlist XMLs into one rekordbox XML that rekordbox can import.

    Phone exports reference tracks by rekordbox content id (TrackID) without file paths.
    Returns (playlists, missing tracks)."""
    root = ET.Element("DJ_PLAYLISTS", Version="1.0.0")
    ET.SubElement(root, "PRODUCT", Name="SETLAB", Version="1", Company="")
    coll = ET.SubElement(root, "COLLECTION", Entries="0")
    pls = ET.SubElement(root, "PLAYLISTS")
    top = ET.SubElement(pls, "NODE", Type="0", Name="ROOT", Count="0")
    folder = ET.SubElement(top, "NODE", Type="0", Name="SETLAB", Count="0")
    added: set[str] = set()
    n_pl = 0
    missing = 0
    for f in files:
        src = ET.parse(f).getroot()
        meta = {el.get("TrackID", ""): el for el in src.iter("TRACK") if el.get("TrackID")}
        for node in src.iter("NODE"):
            if node.get("Type") != "1":
                continue
            ids = [t.get("Key", "") for t in node.findall("TRACK")]
            pl = ET.SubElement(folder, "NODE", Name=node.get("Name", f.stem), Type="1", KeyType="0", Entries=str(len(ids)))
            for tid in ids:
                loc = locations.get(tid)
                if not loc:
                    missing += 1
                    continue
                if tid not in added:
                    m = meta.get(tid)
                    ET.SubElement(
                        coll,
                        "TRACK",
                        TrackID=tid,
                        Name=loc.get("title") or (m.get("Name", "") if m is not None else ""),
                        Artist=loc.get("artist") or (m.get("Artist", "") if m is not None else ""),
                        Location=encode_location(loc["path"]),
                    )
                    added.add(tid)
                ET.SubElement(pl, "TRACK", Key=tid)
            pl.set("Entries", str(len(pl.findall("TRACK"))))
            n_pl += 1
    coll.set("Entries", str(len(added)))
    folder.set("Count", str(n_pl))
    top.set("Count", "1")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(root).write(out_path, encoding="UTF-8", xml_declaration=True)
    return n_pl, missing


def find_phone_exports(extra: list[Path]) -> list[Path]:
    found = [p for p in extra if p.exists()]
    d = downloads_dir()
    if d.exists():
        found += sorted(d.glob("setlab-*.xml"))
    seen, out = set(), []
    for p in found:
        if p.resolve() not in seen:
            seen.add(p.resolve())
            out.append(p)
    return out


def playlists_output() -> Path:
    return default_xml_path().parent / "setlab-playlists.xml"


# ---------------------------------------------------------------------------
# Setup and scheduling (Windows)


_TOKEN_RE = re.compile(r"(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]{20,}")


def looks_like_token(s: str) -> bool:
    return bool(_TOKEN_RE.fullmatch(s or ""))


def clipboard_text() -> str:
    """Clipboard text on Windows via PowerShell (no extra package). Empty when unavailable."""
    if os.name != "nt":
        return ""
    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-Command", "Get-Clipboard -Raw"],
            capture_output=True, text=True, timeout=20,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return (r.stdout or "").strip()


def read_token(ask=getpass.getpass, clipboard=clipboard_text) -> str:
    """Hidden prompt for token A. Pasting shows nothing (by design), so confirm what was
    received, and fall back to the clipboard when the console did not take the paste.
    The token itself is never printed."""
    print("Copy token A, then paste it here (right-click or Ctrl+V) and press Enter.")
    print("Nothing appears while you paste: that is normal, the token stays hidden.")
    print("If pasting does not work, just press Enter: the token is then read from the clipboard.")
    typed = "".join(ch for ch in ask("Token A: ") if ch.isprintable()).strip()
    if looks_like_token(typed):
        print(f"Token received ({len(typed)} characters).")
        return typed
    clip = clipboard()
    if looks_like_token(clip):
        print(f"Token read from the clipboard ({len(clip)} characters).")
        return clip
    if typed:
        print(f"Received {len(typed)} characters, but GitHub tokens start with github_pat_. Checking it anyway.")
    return typed


def setup(cfg_path: Path) -> Config:
    cfg = Config.load(cfg_path)
    print("SETLAB sync setup. Your token is stored only on this laptop and never shown.")
    token = read_token()
    if token:
        cfg.token = token
    if not cfg.token:
        raise RuntimeError("No token received. Copy token A from GitHub, then run install.bat again.")
    name = input("Data repo name [setlab-data]: ").strip() or "setlab-data"
    if "/" in name:
        cfg.repo = name
    else:
        import requests

        r = requests.get(f"{API}/user", headers={"Authorization": f"Bearer {cfg.token}", "X-GitHub-Api-Version": API_VERSION}, timeout=30)
        if r.status_code != 200:
            raise GitHubError(r.status_code, explain(r.status_code))
        cfg.repo = f"{r.json()['login']}/{name}"
    GitHub(cfg.token, cfg.repo).check()
    cfg.save(cfg_path)
    print(f"Saved. Data repo: {cfg.repo}")
    return cfg


def _pythonw() -> str:
    exe = Path(sys.executable)
    w = exe.with_name("pythonw.exe")
    return str(w if w.exists() else exe)


def install_schedule() -> None:
    """Every 2 hours and daily at 23:00 via schtasks (no admin needed), plus a Startup
    shortcut for 'at logon' (schtasks ONLOGON usually needs admin rights)."""
    script = str(Path(__file__).resolve())
    tr = f'"{_pythonw()}" "{script}"'
    subprocess.run(["schtasks", "/Create", "/F", "/TN", TASK_NAMES[0], "/SC", "HOURLY", "/MO", "2", "/TR", tr], check=True)
    subprocess.run(["schtasks", "/Create", "/F", "/TN", TASK_NAMES[1], "/SC", "DAILY", "/ST", "23:00", "/TR", tr], check=True)
    startup = Path(os.environ["APPDATA"]) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup" / STARTUP_LINK
    ps = (
        "$s=(New-Object -ComObject WScript.Shell).CreateShortcut($env:LNK);"
        "$s.TargetPath=$env:TGT;$s.Arguments=$env:ARGS;$s.WindowStyle=7;$s.Save()"
    )
    env = dict(os.environ, LNK=str(startup), TGT=_pythonw(), ARGS=f'"{script}"')
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True, env=env)
    print("Scheduled: at logon, every 2 hours, and daily at 23:00.")


def remove_schedule() -> None:
    for name in TASK_NAMES:
        subprocess.run(["schtasks", "/Delete", "/F", "/TN", name], check=False)
    startup = Path(os.environ.get("APPDATA", "")) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup" / STARTUP_LINK
    if startup.exists():
        startup.unlink()
    print("Schedule removed.")


# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    if sys.stdout is not None and hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:  # pragma: no cover
            pass
    p = argparse.ArgumentParser(description="SETLAB sync: rekordbox -> private data repo")
    p.add_argument("--setup", action="store_true")
    p.add_argument("--install-schedule", action="store_true")
    p.add_argument("--remove-schedule", action="store_true")
    p.add_argument("--xml", type=Path)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--playlists", nargs="*", type=Path)
    args = p.parse_args(argv)
    setup_logging()
    cfg_path = app_dir() / "config.json"
    try:
        if args.setup:
            setup(cfg_path)
            return 0
        if args.install_schedule:
            install_schedule()
            return 0
        if args.remove_schedule:
            remove_schedule()
            return 0
        cfg = Config.load(cfg_path)
        if args.playlists is not None:
            files = find_phone_exports(args.playlists)
            if not files:
                print("No playlist file found. Save the file exported by the app (setlab-*.xml) to Downloads.")
                return 1
            try:
                locs = _db_locations()
            except Exception:
                xml_path = Path(cfg.xml_path) if cfg.xml_path else default_xml_path()
                locs = _xml_locations(xml_path)
            n, missing = resolve_playlists(files, locs, playlists_output())
            print(f"✅ {n} playlist(s) ready in {playlists_output()}" + (f" ({missing} tracks not found)" if missing else ""))
            return 0
        report = sync(cfg, xml_override=args.xml, dry_run=args.dry_run)
        log.info("✅ %s", report)
        # Phone playlists waiting in Downloads are converted on every run too.
        files = find_phone_exports([])
        if files:
            try:
                n, _ = resolve_playlists(files, _db_locations(), playlists_output())
                log.info("%d phone playlist(s) ready for rekordbox", n)
            except Exception as e:  # pragma: no cover - best effort
                log.warning("Phone playlists not converted: %s", type(e).__name__)
        return 0
    except GitHubError as e:
        log.error("❌ %s", e)
        return 1
    except Exception as e:
        log.error("❌ %s: %s", type(e).__name__, e)
        return 1


if __name__ == "__main__":
    sys.exit(main())
