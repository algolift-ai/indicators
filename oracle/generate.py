"""Write the oracle fixtures (the 500-indicator plan, P2).

    <venv>\\Scripts\\python.exe -I oracle/generate.py wma trima
    <venv>\\Scripts\\python.exe -I oracle/generate.py --family momentum
    <venv>\\Scripts\\python.exe -I oracle/generate.py --all
    <venv>\\Scripts\\python.exe -I oracle/generate.py --list
    <venv>\\Scripts\\python.exe -I oracle/generate.py --dry-run qqe
    <venv>\\Scripts\\python.exe -I oracle/generate.py --check --all

Each catalogue id's oracle is declared in families/<family>.py (ORACLES);
its fixture is fixtures/<id>.json. The venv
lives outside the repo (requirements.txt says how), and `-I` keeps the
interpreter from importing anything from the current directory or the user's
site-packages. Steps and conventions: plan/design/indicators/PORTING.md.
"""

from __future__ import annotations

import argparse
import json
import importlib
import sys
from pathlib import Path

# -I leaves the script's own folder off sys.path; this folder is ours.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np  # noqa: E402

import oraclelib  # noqa: E402

FAMILIES = (
    "moving_averages",
    "price_transforms",
    "momentum",
    "trend_strength",
    "volatility",
    "bands_channels",
    "volume",
    "order_flow",
    "cycles",
    "statistics",
    "regression",
    "market_structure",
    "session_time",
    "candlestick_patterns",
)
# The package's indicators and their families (written by the sync from the catalog).
CATALOGUE = Path(__file__).resolve().parent / "catalog.json"


def catalogue() -> dict[str, dict[str, str]]:
    return {cid: {"family": fam} for cid, fam in json.loads(CATALOGUE.read_text(encoding="utf-8")).items()}


def all_oracles() -> dict[str, tuple[str, oraclelib.Oracle]]:
    out: dict[str, tuple[str, oraclelib.Oracle]] = {}
    # families/<family>.py holds the library oracles, families/<family>_concepts.py
    # the independent implementations of our own concepts (PORTING.md § 14), and
    # any other families/<family>_<part>.py a parallel batch of one family owns.
    here = Path(__file__).resolve().parent / "families"
    for fam in FAMILIES:
        parts = sorted(p.stem for p in here.glob(f"{fam}_*.py"))
        for modname in [f"families.{fam}"] + [f"families.{p}" for p in parts]:
            try:
                mod = importlib.import_module(modname)
            except ModuleNotFoundError as e:
                if e.name == modname:
                    continue
                raise
            for cid, oracle in getattr(mod, "ORACLES", {}).items():
                if cid in out:
                    raise SystemExit(f"{cid} has an oracle in both {out[cid][0]} and {modname}")
                out[cid] = (fam, oracle)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ids", nargs="*", help="catalogue ids")
    ap.add_argument("--family", action="append", default=[], choices=FAMILIES)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--list", action="store_true", help="list the declared oracles and exit")
    ap.add_argument("--check", action="store_true", help="recompute and compare with the fixtures on disk; write nothing; exit 1 on a difference")
    ap.add_argument("--dry-run", action="store_true", help="compute and summarize; write nothing")
    args = ap.parse_args()

    rows = catalogue()
    oracles = all_oracles()
    for cid, (fam, _) in oracles.items():
        row = rows.get(cid)
        if row is None:
            raise SystemExit(f"{cid} (families/{fam}.py) is not in catalog.json")
        if row["family"] != fam:
            raise SystemExit(f"{cid} is declared in families/{fam}.py but catalog.json puts it in {row['family']}")

    if args.list:
        for cid, (fam, o) in sorted(oracles.items(), key=lambda x: (x[1][0], x[0])):
            print(f"{fam:20} {cid:24} {o.library}")
        return 0

    wanted = list(args.ids)
    if args.all:
        wanted += list(oracles)
    for fam in args.family:
        wanted += [cid for cid, (f, _) in oracles.items() if f == fam]
    wanted = list(dict.fromkeys(wanted))
    if not wanted:
        ap.error("name catalogue ids, --family or --all")
    missing = [cid for cid in wanted if cid not in oracles]
    if missing:
        raise SystemExit(f"no oracle declared for: {', '.join(missing)} (add it to families/<family>.py)")

    versions = oraclelib.check_versions()
    bars = oraclelib.load_bars()
    stale = []
    for cid in wanted:
        _fam, oracle = oracles[cid]
        cases = oracle.compute(bars)
        text = oraclelib.render_fixture(cid, oracle, cases, bars, versions)
        path = oraclelib.fixture_path(cid, oracle.fixture_dir)
        rel = path.relative_to(oraclelib.REPO).as_posix()
        if args.check:
            same = path.exists() and oraclelib.fixture_matches(path.read_text(encoding="utf-8"), text)
            print(f"{'ok   ' if same else 'STALE'} {rel}")
            if not same:
                stale.append(cid)
        elif args.dry_run:
            for c in cases:
                defined = {k: int((~np.isnan(v)).sum()) for k, v in c.outputs.items()}
                print(f"{cid:20} {c.entry:12} {c.settings} values: {defined}")
        else:
            oraclelib.write_fixture(cid, text, oracle.fixture_dir)
            print(f"wrote {rel} ({len(cases)} cases, {oracle.library})")
    return 1 if stale else 0


if __name__ == "__main__":
    raise SystemExit(main())
