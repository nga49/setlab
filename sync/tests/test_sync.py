import json
import re
from pathlib import Path
from types import SimpleNamespace

import pytest

import setlab_sync as s
from camelot import KEY_TABLE, parse_key

FIX = Path(__file__).parent / "fixtures"
ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(autouse=True)
def tmp_appdata(tmp_path, monkeypatch):
    monkeypatch.setenv("APPDATA", str(tmp_path / "appdata"))
    monkeypatch.setenv("USERPROFILE", str(tmp_path / "home"))
    return tmp_path


# --- shared key table -------------------------------------------------------


def test_keys_json_matches_python_table():
    data = json.loads((ROOT / "sync" / "keys.json").read_text(encoding="utf-8"))["keys"]
    assert [(k["camelot"], k["name"], tuple(k["names"]), k["openKey"]) for k in data] == KEY_TABLE


def test_keys_json_matches_typescript_table():
    src = (ROOT / "src" / "engine" / "camelot.ts").read_text(encoding="utf-8")
    ts = re.findall(r"\{ camelot: '(\w+)', name: '([^']+)', names: \[([^\]]*)\], openKey: '(\w+)' \}", src)
    ts = [(c, n, tuple(re.findall(r"'([^']+)'", names)), ok) for c, n, names, ok in ts]
    assert ts == KEY_TABLE


@pytest.mark.parametrize("raw,expected", [("Am", "8A"), ("8A", "8A"), ("08a", "8A"), ("1m", "8A"), ("F#m", "11A"), ("Gbm", "11A"), ("Db", "3B"), ("C major", "8B"), ("", None), (None, None), ("H", None)])
def test_parse_key(raw, expected):
    assert parse_key(raw) == expected


def test_all_spellings_parse():
    for cam, _, names, ok in KEY_TABLE:
        assert parse_key(cam) == cam
        assert parse_key(ok) == cam
        for n in names:
            assert parse_key(n) == cam


# --- normalizers ----------------------------------------------------------------


def test_normalizers():
    assert s.norm_bpm(12800) == 128.0
    assert s.norm_bpm("124.5") == 124.5
    assert s.norm_bpm(0) is None
    assert s.norm_bpm("x") is None
    assert s.norm_rating(204) == 4
    assert s.norm_rating(3) == 3
    assert s.norm_rating(None) == 0
    assert s.norm_year("2004-05-01") == 2004
    assert s.norm_year(0) is None
    assert s.norm_date("2026/08/15") == "2026-08-15"
    assert s.norm_date("") is None
    assert s.split_remix("Demo Track (Demo Remix X)") == ("Demo Track", "Demo Remix X")
    assert s.split_remix("Demo Track (Original Mix)") == ("Demo Track", None)
    assert s.make_track(1, "", "x") is None


# --- XML source -------------------------------------------------------------------


def test_read_from_xml():
    tracks, version = s.read_from_xml(FIX / "rekordbox.xml")
    assert version == "7.0.0"
    by = {t["id"]: t for t in tracks}
    assert set(by) == {"rb:101", "rb:102", "rb:103"}  # no-title track skipped
    a = by["rb:101"]
    assert a["title"] == "Demo Track A" and a["remix"] == "Demo Remix X"
    assert a["bpm"] == 124.0 and a["keyRaw"] == "Am" and a["camelot"] == "8A"
    assert a["lengthSec"] == 372 and a["year"] == 2021 and a["rating"] == 4
    assert a["playlists"] == ["Warm-up"]
    b = by["rb:102"]
    assert b["remix"] is None and b["camelot"] == "8A" and b["playlists"] == ["Party 2000s"]
    c = by["rb:103"]
    assert c["bpm"] is None and c["year"] is None and c["camelot"] is None and c["remix"] == "Demo Remixer Remix"
    assert c["dateAdded"] == "2026-08-15"
    # No file paths in tracks.json (docs/DATA.md).
    assert "C:/Music" not in json.dumps(tracks)


# --- DB source (mocked pyrekordbox) -----------------------------------------------------


def fake_db():
    content = [
        SimpleNamespace(ID=11, Title="Demo Track K", ArtistName="Demo Artist 07", AlbumName=None, LabelName=None, GenreName="Tech House", BPM=12450, KeyName="Fm", Length=380, ReleaseYear=2024, Rating=5, Commnt="", StockDate="2026-10-01", DateCreated=None, RemixerName=None, MyTagNames=["Peak"], rb_local_deleted=0, FolderPath="C:/Music/k.mp3"),
        SimpleNamespace(ID=12, Title="Demo Track Deleted", ArtistName="x", BPM=12000, rb_local_deleted=1),
        SimpleNamespace(ID=13, Title="Demo Track L (Demo Remix)", ArtistName="Demo Artist 08", GenreName=None, BPM=0, KeyName=None, Length=None, ReleaseYear=None, Rating=0, Commnt=None, StockDate=None, DateCreated="2026-01-02", RemixerName=None, MyTagNames=None, rb_local_deleted=0, FolderPath="C:/Music/l.mp3"),
    ]
    playlists = [
        SimpleNamespace(Name="Peak time", Attribute=0, rb_local_deleted=0, Songs=[SimpleNamespace(ContentID=11), SimpleNamespace(ContentID=13)]),
        SimpleNamespace(Name="A folder", Attribute=1, rb_local_deleted=0, Songs=[]),
        SimpleNamespace(Name="Smart", Attribute=4, rb_local_deleted=0, Songs=[SimpleNamespace(ContentID=11)]),
    ]
    return SimpleNamespace(get_content=lambda: content, get_playlist=lambda: playlists)


def test_read_from_db_mocked():
    tracks, _ = s.read_from_db(fake_db())
    by = {t["id"]: t for t in tracks}
    assert set(by) == {"rb:11", "rb:13"}
    k = by["rb:11"]
    assert k["bpm"] == 124.5 and k["camelot"] == "4A" and k["playlists"] == ["Peak time"] and k["myTag"] == ["Peak"]
    assert by["rb:13"]["remix"] == "Demo Remix" and by["rb:13"]["dateAdded"] == "2026-01-02"


def test_payload_hash_ignores_timestamp():
    tracks, _ = s.read_from_db(fake_db())
    p1 = s.build_payload(tracks, "pyrekordbox", "7")
    p2 = s.build_payload(list(reversed(tracks)), "pyrekordbox", "7")
    p2["generatedAt"] = "2000-01-01T00:00:00Z"
    assert s.content_hash(p1) == s.content_hash(p2)
    assert p1["schema"] == 1 and p1["count"] == 2


# --- sync with mocked GitHub ---------------------------------------------------------------


class FakeGH:
    def __init__(self, fail_first=None):
        self.puts = []
        self.fail_first = fail_first

    def get_sha(self, path):
        return "remote-sha"

    def put(self, path, content, message, sha):
        if self.fail_first:
            st, self.fail_first = self.fail_first, None
            raise s.GitHubError(st, s.explain(st))
        self.puts.append((path, json.loads(content), message, sha))
        return f"sha-{len(self.puts)}"


def test_sync_pushes_then_skips_when_unchanged():
    cfg = s.Config(repo="demo/setlab-data", token="t")
    gh = FakeGH()
    r1 = s.sync(cfg, db=fake_db(), github=gh)
    assert "2 tracks synced" in r1
    path, payload, msg, sha = gh.puts[0]
    assert path == "tracks.json" and msg == "sync: 2 tracks (+2)" and sha == "remote-sha"
    assert payload["source"] == "pyrekordbox"
    r2 = s.sync(cfg, db=fake_db(), github=gh)
    assert r2.startswith("No change") and len(gh.puts) == 1


def test_sync_retries_on_conflict_and_reports_errors():
    cfg = s.Config(repo="demo/setlab-data", token="t")
    gh = FakeGH(fail_first=409)
    assert "synced" in s.sync(cfg, db=fake_db(), github=gh)
    with pytest.raises(s.GitHubError) as e:
        s.State().save(s.app_dir() / "state.json")
        s.sync(cfg, db=fake_db(), github=FakeGH(fail_first=401))
    assert "Token rejected" in str(e.value)


def test_falls_back_to_xml_when_db_fails(tmp_appdata):
    class Broken:
        def get_playlist(self):
            raise RuntimeError("locked")

    xml = tmp_appdata / "lib.xml"
    xml.write_bytes((FIX / "rekordbox.xml").read_bytes())
    cfg = s.Config(repo="demo/setlab-data", token="t", xml_path=str(xml))
    gh = FakeGH()
    s.sync(cfg, db=Broken(), github=gh)
    assert gh.puts[0][1]["source"] == "rekordbox-xml"
    cfg.xml_path = str(tmp_appdata / "missing.xml")
    s.State().save(s.app_dir() / "state.json")
    with pytest.raises(FileNotFoundError):
        s.sync(cfg, db=Broken(), github=gh)


def test_dry_run_and_not_configured():
    cfg = s.Config()
    assert "Dry run" in s.sync(cfg, db=fake_db(), dry_run=True)
    assert json.loads((s.app_dir() / "tracks.json").read_text(encoding="utf-8"))["count"] == 2
    with pytest.raises(RuntimeError):
        s.sync(cfg, db=fake_db())


def test_explain_messages():
    for code in (401, 403, 404, 409, 500):
        assert s.explain(code)


# --- phone playlists -> rekordbox XML ------------------------------------------------------------


def test_resolve_playlists(tmp_appdata):
    locs = s._xml_locations(FIX / "rekordbox.xml")
    assert locs["101"]["path"] == "C:/Music/demo a.mp3"
    out = tmp_appdata / "out.xml"
    n, missing = s.resolve_playlists([FIX / "phone-export.xml"], locs, out)
    assert (n, missing) == (1, 1)
    import xml.etree.ElementTree as ET

    root = ET.parse(out).getroot()
    tracks = root.find("COLLECTION").findall("TRACK")
    assert len(tracks) == 1 and tracks[0].get("Location") == "file://localhost/C:/Music/demo%20a.mp3"
    pl = [n for n in root.iter("NODE") if n.get("Type") == "1"][0]
    assert pl.get("Name") == "Saturday warm-up" and pl.get("Entries") == "1" and pl.get("KeyType") == "0"


def test_main_dry_run_cli(monkeypatch):
    monkeypatch.setattr(s, "read_from_db", lambda db=None: (_ for _ in ()).throw(RuntimeError("no db")))
    assert s.main(["--dry-run", "--xml", str(FIX / "rekordbox.xml")]) == 0
    assert s.main(["--playlists", str(FIX / "missing.xml")]) == 1


def test_resolves_the_xml_the_app_exports(tmp_appdata):
    """Cross-language contract: tests/practice.test.ts checks the app writes exactly this file."""
    locs = s._xml_locations(FIX / "rekordbox.xml")
    out = tmp_appdata / "playlists.xml"
    n, missing = s.resolve_playlists([FIX / "app-export.xml"], locs, out)
    assert (n, missing) == (1, 0)
    import xml.etree.ElementTree as ET

    root = ET.parse(out).getroot()
    locations = [t.get("Location") for t in root.find("COLLECTION").findall("TRACK")]
    assert locations == ["file://localhost/C:/Music/demo%20a.mp3", "file://localhost/C:/Music/demo%20b.mp3"]
    pl = [n for n in root.iter("NODE") if n.get("Type") == "1"][0]
    assert pl.get("Name") == "Saturday warm-up" and [t.get("Key") for t in pl.findall("TRACK")] == ["101", "102"]


# Token prompt: pasting into a hidden prompt shows nothing, so confirm and fall back to
# the clipboard. Fake token built at runtime so no token-shaped literal sits in the repo.
FAKE_TOKEN = "github" + "_pat_" + "x1" * 41


def _no_clipboard():
    raise AssertionError("clipboard should not be read")


def test_read_token_typed(capsys):
    assert s.read_token(ask=lambda _p: FAKE_TOKEN + "\r\n", clipboard=_no_clipboard) == FAKE_TOKEN
    out = capsys.readouterr().out
    assert f"Token received ({len(FAKE_TOKEN)} characters)" in out
    assert FAKE_TOKEN not in out


@pytest.mark.parametrize("typed", ["", "\x16", "  "])
def test_read_token_falls_back_to_clipboard(typed, capsys):
    assert s.read_token(ask=lambda _p: typed, clipboard=lambda: FAKE_TOKEN) == FAKE_TOKEN
    out = capsys.readouterr().out
    assert "read from the clipboard" in out
    assert FAKE_TOKEN not in out


def test_read_token_nothing_usable(capsys):
    assert s.read_token(ask=lambda _p: "", clipboard=lambda: "some other text") == ""
    assert s.read_token(ask=lambda _p: "wrong", clipboard=lambda: "") == "wrong"
    assert "Checking it anyway" in capsys.readouterr().out


def test_setup_without_any_token_stops(tmp_path, monkeypatch):
    monkeypatch.setattr(s, "read_token", lambda: "")
    with pytest.raises(RuntimeError, match="No token received"):
        s.setup(tmp_path / "config.json")


def test_config_accepts_bom(tmp_path):
    p = tmp_path / "config.json"
    p.write_bytes(b"\xef\xbb\xbf" + json.dumps({"repo": "me/setlab-data", "token": "t"}).encode())
    assert s.Config.load(p).repo == "me/setlab-data"


def test_setup_401_explains_the_paste(tmp_path, monkeypatch):
    class R:
        status_code = 401

    import requests

    monkeypatch.setattr(s, "read_token", lambda: FAKE_TOKEN)
    monkeypatch.setattr("builtins.input", lambda _p="": "")
    monkeypatch.setattr(requests, "get", lambda *a, **k: R())
    with pytest.raises(s.GitHubError, match="press Enter"):
        s.setup(tmp_path / "config.json")
    assert not (tmp_path / "config.json").exists()


def test_task_names_are_valid_windows_names():
    # schtasks answers "The parameter is incorrect" for names with these characters.
    for name in s.TASK_NAMES:
        assert not set(name) & set('\\/:*?"<>|'), name
    bat = (Path(__file__).parent.parent / "uninstall.bat").read_text(encoding="utf-8")
    for name in s.TASK_NAMES:
        assert f'"{name}"' in bat


def test_setup_keeps_saved_token(tmp_path, monkeypatch, capsys):
    cfg_path = tmp_path / "config.json"
    s.Config(repo="me/setlab-data", token=FAKE_TOKEN).save(cfg_path)
    monkeypatch.setattr(s, "read_token", lambda: "")
    monkeypatch.setattr("builtins.input", lambda _p="": "me/setlab-data")
    monkeypatch.setattr(s.GitHub, "check", lambda self: None)
    assert s.setup(cfg_path).token == FAKE_TOKEN
    out = capsys.readouterr().out
    assert "keeping the one already saved" in out and FAKE_TOKEN not in out


# Watcher: sync each time rekordbox closes.


def _watch(running, exports=None, run_raises=False, others=()):
    """Runs watch() on a scripted list of 'is rekordbox running' answers."""
    calls = {"run": 0, "convert": 0, "slept": []}
    seq = iter(running)
    exp = iter(exports) if exports is not None else None

    def run(_p):
        calls["run"] += 1
        if run_raises:
            raise RuntimeError("boom")

    def convert():
        calls["convert"] += 1

    rc = s.watch(
        Path("cfg.json"),
        is_running=lambda: next(seq),
        sleep=lambda sec: calls["slept"].append(sec),
        run=run,
        exports=(lambda: next(exp)) if exp else (lambda: ()),
        convert=convert,
        others=lambda: list(others),
        max_polls=len(running) - 1,
    )
    return rc, calls


def test_watch_syncs_once_at_start_then_each_time_rekordbox_closes():
    # start: closed · opened · still open · closed · closed · opened · closed
    rc, calls = _watch([False, True, True, False, False, True, False])
    assert rc == 0
    assert calls["run"] == 1 + 2
    assert calls["slept"][0] == s.WATCH_START_DELAY_S
    assert calls["slept"].count(s.WATCH_SETTLE_S) >= 2


def test_watch_rekordbox_open_at_start_syncs_when_it_closes():
    _, calls = _watch([True, True, False])
    assert calls["run"] == 1 + 1


def test_watch_keeps_going_when_a_sync_fails():
    # Every sync raises (offline, GitHub down...): the watcher keeps polling and retries next close.
    _, calls = _watch([False, True, False, True, False], run_raises=True)
    assert calls["run"] == 3


def test_watch_does_not_start_twice():
    rc, calls = _watch([False, True, False], others=[1234])
    assert rc == 0 and calls["run"] == 0


def test_watch_converts_new_phone_playlists():
    a, b = (("setlab-a.xml", 1),), (("setlab-a.xml", 1), ("setlab-b.xml", 2))
    # exports() is read once at start, then once per poll
    _, calls = _watch([False, False, False, False], exports=[a, a, b, b])
    assert calls["convert"] == 1


def test_only_the_rekordbox_app_counts_not_its_background_agent():
    assert s.rekordbox_running(["explorer.exe", "rekordboxAgent.exe"]) is False
    assert s.rekordbox_running(["explorer.exe", "rekordbox.exe"]) is True
    assert s.rekordbox_running(["Rekordbox.EXE"]) is True
