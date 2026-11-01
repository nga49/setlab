import sys
from pathlib import Path

# Make sync/*.py importable without installing anything.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
