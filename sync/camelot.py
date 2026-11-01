"""Camelot key table and parser. Mirrors src/engine/camelot.ts (checked against keys.json in tests)."""
from __future__ import annotations

import re

# (camelot, canonical name, all accepted spellings, open key)
KEY_TABLE: list[tuple[str, str, tuple[str, ...], str]] = [
    ("1A", "Abm", ("Abm", "G#m"), "6m"),
    ("1B", "B", ("B", "Cb"), "6d"),
    ("2A", "Ebm", ("Ebm", "D#m"), "7m"),
    ("2B", "F#", ("F#", "Gb"), "7d"),
    ("3A", "Bbm", ("Bbm", "A#m"), "8m"),
    ("3B", "Db", ("Db", "C#"), "8d"),
    ("4A", "Fm", ("Fm", "E#m"), "9m"),
    ("4B", "Ab", ("Ab", "G#"), "9d"),
    ("5A", "Cm", ("Cm", "B#m"), "10m"),
    ("5B", "Eb", ("Eb", "D#"), "10d"),
    ("6A", "Gm", ("Gm",), "11m"),
    ("6B", "Bb", ("Bb", "A#"), "11d"),
    ("7A", "Dm", ("Dm",), "12m"),
    ("7B", "F", ("F", "E#"), "12d"),
    ("8A", "Am", ("Am",), "1m"),
    ("8B", "C", ("C", "B#"), "1d"),
    ("9A", "Em", ("Em", "Fbm"), "2m"),
    ("9B", "G", ("G",), "2d"),
    ("10A", "Bm", ("Bm", "Cbm"), "3m"),
    ("10B", "D", ("D",), "3d"),
    ("11A", "F#m", ("F#m", "Gbm"), "4m"),
    ("11B", "A", ("A",), "4d"),
    ("12A", "C#m", ("C#m", "Dbm"), "5m"),
    ("12B", "E", ("E", "Fb"), "5d"),
]

_BY_MUSICAL = {n.lower(): cam for cam, _, names, _ in KEY_TABLE for n in names}
_BY_OPENKEY = {ok: cam for cam, _, _, ok in KEY_TABLE}

_CAMELOT = re.compile(r"^0?(1[0-2]|[1-9])\s*([ab])$", re.I)
_OPENKEY = re.compile(r"^0?(1[0-2]|[1-9])\s*([md])$", re.I)
_MUSICAL = re.compile(r"^([a-g])\s*(#|b)?\s*(m|min|minor|maj|major|dur|moll)?$", re.I)


def parse_key(raw: str | None) -> str | None:
    """Camelot ("8A"), Open Key ("1m") or musical ("Am", "F#m", "Db major") -> Camelot or None."""
    if raw is None:
        return None
    s = re.sub(r"\s+", " ", str(raw).strip().replace("♯", "#").replace("♭", "b"))
    if not s:
        return None
    m = _CAMELOT.match(s)
    if m:
        return f"{int(m.group(1))}{m.group(2).upper()}"
    m = _OPENKEY.match(s)
    if m:
        return _BY_OPENKEY.get(f"{int(m.group(1))}{m.group(2).lower()}")
    m = _MUSICAL.match(s)
    if m:
        quality = (m.group(3) or "").lower()
        minor = quality in ("m", "min", "minor", "moll")
        key = f"{m.group(1).upper()}{m.group(2) or ''}{'m' if minor else ''}".lower()
        return _BY_MUSICAL.get(key)
    return None
