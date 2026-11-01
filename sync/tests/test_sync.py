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
