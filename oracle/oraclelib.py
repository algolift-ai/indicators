"""The indicator oracle's machinery (the 500-indicator plan, P2).

A library's own output on the catalogue's fixed bars is the test oracle for
every ported spec: generate.py computes it here and writes
src/lib/indicators/catalog/__fixtures__/<catalogueId>.json, and
catalog/__tests__/oracle.test.ts holds the TypeScript spec to it.

Family files (families/<family>.py) declare ORACLES = {catalogueId: Oracle},
mostly through talib_oracle(), ptac_oracle() and pta_oracle(). One session per family edits
only its own file. The conventions are in plan/design/indicators/PORTING.md.
"""

from __future__ import annotations

import hashlib
import importlib
import importlib.metadata as md
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Mapping, Sequence

import numpy as np

REPO = Path(__file__).resolve().parents[1]
FIXTURES = REPO / "fixtures"
BARS_FILE = FIXTURES / "_bars.json"
REQUIREMENTS = Path(__file__).resolve().parent / "requirements.txt"
COLUMNS = ("open", "high", "low", "close", "volume")

# The `source` setting of a single-input study (catalog/source.ts holds the
# TypeScript twin; the arithmetic is written in the same order on both sides,
# so the two are bit-identical).
SOURCES: Mapping[str, Callable[[Mapping[str, np.ndarray]], np.ndarray]] = {
    "open": lambda b: b["open"],
    "high": lambda b: b["high"],
    "low": lambda b: b["low"],
    "close": lambda b: b["close"],
    "hl2": lambda b: (b["high"] + b["low"]) / 2.0,
    "hlc3": lambda b: (b["high"] + b["low"] + b["close"]) / 3.0,
    "ohlc4": lambda b: (b["open"] + b["high"] + b["low"] + b["close"]) / 4.0,
}

Bars = Mapping[str, np.ndarray]
Outputs = Mapping[str, np.ndarray]


# --------------------------------------------------------------------------- bars


def load_bars() -> dict[str, np.ndarray]:
    doc = json.loads(BARS_FILE.read_text(encoding="utf-8"))
    bars = {c: np.asarray(doc[c], dtype=np.float64) for c in COLUMNS}
    n = doc["count"]
    for c in COLUMNS:
        if len(bars[c]) != n:
            raise SystemExit(f"_bars.json: column {c} has {len(bars[c])} values, count says {n}")
    # IX-R9: each bar's close, epoch ms UTC (30-minute bars on the CME
    # equity-futures session). A calendar concept oracle reads it with zoneinfo,
    # never through the TypeScript calendar. Not part of the values hash.
    bars["closeTime"] = np.asarray(doc["closeTime"], dtype=np.int64)
    # IX-R12: each bar's order flow (buy_volume ... large_sell_volume), NaN where
    # the bar has none (bars 120 to 129). Read by the order_flow concept oracles.
    # Not part of the values hash; flow_sha256 records it.
    for c in FLOW_COLUMNS:
        if c in doc:
            bars[c] = np.asarray([np.nan if v is None else v for v in doc[c]], dtype=np.float64)
    return bars


FLOW_COLUMNS = ("buy_volume", "sell_volume", "trade_count", "buy_trades", "sell_trades",
                "large_buy_volume", "large_sell_volume")


def flow_sha256(bars: Bars) -> str:
    """The order-flow columns' hash, as bars_sha256 hashes the values (NaN as
    float64 NaN's bytes). An order_flow fixture records it in its note, and
    order_flow.test.ts recomputes it, so a change of `_bars.json`'s order flow
    is a stale fixture, never a silent one."""
    h = hashlib.sha256()
    for c in FLOW_COLUMNS:
        h.update(np.ascontiguousarray(bars[c], dtype="<f8").tobytes())
    return h.hexdigest()


# The bars' clock, as the chart hands it to a calendar formula.
BARS_ASSET = "futures"
BARS_MINUTES = 30


def bars_sha256(bars: Bars) -> str:
    """The values' hash: every column's float64 little-endian bytes, in COLUMNS order.

    Hashing values, not the file, keeps it independent of line endings and of
    how JSON spells a number. oracle.test.ts computes the same hash.
    """
    h = hashlib.sha256()
    for c in COLUMNS:
        h.update(np.ascontiguousarray(bars[c], dtype="<f8").tobytes())
    return h.hexdigest()


def source(bars: Bars, name: str) -> np.ndarray:
    if name not in SOURCES:
        raise ValueError(f"unknown source {name!r}; one of {sorted(SOURCES)}")
    return SOURCES[name](bars)


# ------------------------------------------------------------------------ oracles


@dataclass(frozen=True)
class Case:
    """One fixture case: what the spec is given, and what the library returned."""

    settings: dict
    entry: str
    call: dict
    inputs: list[str]
    outputs: dict[str, np.ndarray]


@dataclass(frozen=True)
class Oracle:
    """How one catalogue row's oracle is computed.

    `cases` are settings in the SPEC's parameter names. The first is the
    spec's defaults (the library's own defaults, PORTING.md § Parameters);
    then at least two others that change the output (a short and a long
    window, another unit, another source).
    `run(bars, settings)` returns (entry, call, inputs, {specOutput: array}).
    """

    library: str
    run: Callable[[Bars, dict], tuple[str, dict, list[str], Outputs]]
    cases: Sequence[dict]
    # A check on cases[0], raising when it is not the library's default call.
    check_defaults: Callable[[dict], None] | None = None
    note: str = ""
    # A subfolder of the fixtures for a comparison that is not the indicator's
    # own fixture: a classic indicator that differs from TA-Lib by a convention
    # keeps TA-Lib's output in talib/<id>.json (families/_classics.py).
    fixture_dir: str = ""

    def compute(self, bars: Bars) -> list[Case]:
        if len(self.cases) < 3:
            raise ValueError("an oracle needs its defaults and at least two other settings")
        if self.check_defaults:
            self.check_defaults(self.cases[0])
        out: list[Case] = []
        for s in self.cases:
            entry, call, inputs, outputs = self.run(bars, dict(s))
            out.append(Case(dict(s), entry, call, inputs, {k: np.asarray(v, dtype=np.float64) for k, v in outputs.items()}))
        return out


def _talib():
    import talib  # noqa: PLC0415 (imported only when an oracle needs it)
    import talib.abstract  # noqa: F401

    return talib


def talib_oracle(
    function: str | Callable[[dict], str],
    *,
    cases: Sequence[dict],
    params: Mapping[str, str] | None = None,
    outputs: Mapping[str, str] | None = None,
    note: str = "",
) -> Oracle:
    """An oracle that calls one TA-Lib function (or one chosen per case).

    - `function`: the TA-Lib name, or a function of the settings choosing it
      (ROC's unit picks ROC, ROCP, ROCR or ROCR100).
    - `params`: spec parameter name -> TA-Lib argument (default period ->
      timeperiod). Settings not listed (source, unit) are never passed.
    - `outputs`: spec output name -> TA-Lib output name. Default: a
      single-output function's only output as `value`.
    A function whose input is one price series reads the case's `source`
    setting (default close); one reading several series gets the bar columns.
    """
    params = dict(params or {"period": "timeperiod"})

    def name_of(s: dict) -> str:
        return function(s) if callable(function) else function

    def run(bars: Bars, s: dict):
        talib = _talib()
        name = name_of(s)
        info = talib.abstract.Function(name).info
        call = {arg: s[p] for p, arg in params.items() if p in s}
        arrays, inputs = [], []
        for key, val in info["input_names"].items():
            if key == "price" or key == "real":
                src = s.get("source", "close")
                arrays.append(source(bars, src))
                inputs.append(src)
            else:
                for col in (val if isinstance(val, (list, tuple)) else [val]):
                    arrays.append(bars[col])
                    inputs.append(col)
        res = getattr(talib, name)(*arrays, **call)
        res = res if isinstance(res, tuple) else (res,)
        by_name = dict(zip(info["output_names"], res))
        mapping = dict(outputs) if outputs else {"value": info["output_names"][0]}
        if not outputs and len(info["output_names"]) != 1:
            raise ValueError(f"{name} has outputs {info['output_names']}: map them with outputs=")
        return name, call, inputs, {spec: by_name[lib] for spec, lib in mapping.items()}

    def check(s: dict):
        talib = _talib()
        name = name_of(s)
        lib_defaults = dict(talib.abstract.Function(name).info["parameters"])
        for p, arg in params.items():
            if arg in lib_defaults and p in s and s[p] != lib_defaults[arg]:
                raise ValueError(f"{name}: cases[0] sets {p}={s[p]!r}, TA-Lib's default {arg} is {lib_defaults[arg]!r}")
        if s.get("source", "close") != "close":
            raise ValueError(f"{name}: cases[0] must read close, TA-Lib's default input")

    return Oracle("TA-Lib", run, cases, check, note)


PANDAS_LIBRARIES = {"pandas_ta_classic": "pandas-ta-classic", "pandas_ta": "pandas-ta"}


def pandas_ta_oracle(
    module: str,
    function: str,
    *,
    cases: Sequence[dict],
    inputs: Sequence[str] = ("close",),
    params: Mapping[str, str] | None = None,
    outputs: Mapping[str, str | int | None] | None = None,
    fixed: Mapping[str, object] | None = None,
    note: str = "",
) -> Oracle:
    """An oracle that calls one function of pandas-ta-classic or pandas-ta.

    Use ptac_oracle() or pta_oracle(); catalogue.csv's `oracle` column says which.
    - `inputs`: the function's series arguments, by its own keyword names
      (close, high, low, open_, volume); `close` reads the case's `source`.
    - `params`: spec parameter name -> the function's keyword (default
      period -> length).
    - `outputs`: spec output name -> DataFrame column by position (0, 1...;
      pandas-ta names columns after the settings, so a name breaks on the
      second case) or by name, or None for a function returning one Series.
      Default {'value': None}.
    - `fixed`: keywords always passed. talib=False is added whenever the
      function takes it, so its own Python runs instead of delegating to TA-Lib.
    The defaults check reads the signature. Most pandas-ta signatures default
    to None and set the real default in the body, which the check cannot see:
    read the body, and write the default in the family file's comment.
    """
    import inspect  # noqa: PLC0415

    library = PANDAS_LIBRARIES[module]
    params = dict(params or {"period": "length"})
    outputs = dict(outputs or {"value": None})
    fixed = dict(fixed or {})

    def fn():
        mod = importlib.import_module(module)
        return getattr(mod, function)

    def run(bars: Bars, s: dict):
        import pandas as pd  # noqa: PLC0415

        call = {arg: s[p] for p, arg in params.items() if p in s}
        kwargs, used = {}, []
        for name in inputs:
            col = "open" if name == "open_" else name
            if name == "close":
                col = s.get("source", "close")
                kwargs[name] = pd.Series(source(bars, col))
            else:
                kwargs[name] = pd.Series(bars[col])
            used.append(col)
        sig = inspect.signature(fn())
        takes_talib = "talib" in sig.parameters or any(p.kind == p.VAR_KEYWORD for p in sig.parameters.values())
        extra = {"talib": False} if takes_talib and "talib" not in fixed else {}
        res = fn()(**kwargs, **call, **fixed, **extra)
        if res is None:
            raise ValueError(f"{module}.{function} returned None for {s} (too few bars, or a bad argument)")
        out = {}
        for spec, colname in outputs.items():
            series = res if colname is None else res.iloc[:, colname] if isinstance(colname, int) else res[colname]
            out[spec] = series.to_numpy(dtype=np.float64, na_value=np.nan)
        return function, {**call, **fixed}, used, out

    def check(s: dict):
        sig = inspect.signature(fn())
        for p, arg in params.items():
            if arg in sig.parameters and p in s:
                d = sig.parameters[arg].default
                if d is not inspect.Parameter.empty and d is not None and s[p] != d:
                    raise ValueError(f"{function}: cases[0] sets {p}={s[p]!r}, the signature's default {arg} is {d!r}")
        if s.get("source", "close") != "close":
            raise ValueError(f"{function}: cases[0] must read close, the library's default input")

    return Oracle(library, run, cases, check, note)


def ptac_oracle(function: str, **kw) -> Oracle:
    """pandas-ta-classic 0.8.32 (catalogue oracle `pandas-ta-classic`)."""
    return pandas_ta_oracle("pandas_ta_classic", function, **kw)


def pta_oracle(function: str, **kw) -> Oracle:
    """pandas-ta 0.4.71b0 from PyPI (catalogue oracle `pandas-ta`): only the rows the classic fork lacks."""
    return pandas_ta_oracle("pandas_ta", function, **kw)


CONCEPT_LIBRARY = "AlgoLift concept (independent numpy)"


def concept_oracle(
    compute: Callable[[Bars, dict], Mapping[str, np.ndarray]],
    *,
    cases: Sequence[dict],
    source: str,
    inputs: Sequence[str] = ("source",),
    note: str = "",
) -> Oracle:
    """An oracle for one of our own concepts (PORTING.md § 14): no library
    computes it, so a second implementation, written in numpy from the
    published source and never from the TypeScript, is the reference.

    - `compute(bars, settings)` returns {specOutput: array}, one value per bar,
      NaN for "no value". `source(bars, settings.get("source", "close"))`
      reads the source setting.
    - `source`: the published source cited (book, article, paper), recorded
      in the fixture beside `note`.
    - `inputs`: the bar series it reads, for the fixture's record ("source"
      is replaced by the case's source setting).
    """

    def run(bars: Bars, s: dict):
        out = compute(bars, dict(s))
        # An input named after a setting (source, series_a, benchmark...) records
        # the bar field that setting chose in this case.
        used = [str(s.get(i, "close" if i == "source" else i)) if (i == "source" or i in s) else i for i in inputs]
        return "concept", {}, used, out

    full_note = f"Independent numpy implementation from: {source}." + (f" {note}" if note else "")
    return Oracle(CONCEPT_LIBRARY, run, cases, None, full_note)


# ------------------------------------------------------------------------ versions


def pinned_versions() -> dict[str, str]:
    pins = {}
    for line in REQUIREMENTS.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if "==" in line:
            name, ver = line.split("==", 1)
            pins[name.strip()] = ver.strip()
    return pins


def check_versions() -> dict[str, str]:
    """Refuse to run on anything but the pinned environment; return the record."""
    bad = []
    for name, ver in pinned_versions().items():
        try:
            have = md.version(name)
        except md.PackageNotFoundError:
            have = None
        if have != ver:
            bad.append(f"{name}: pinned {ver}, installed {have}")
    if bad:
        raise SystemExit("The oracle venv is not the pinned one:\n  " + "\n  ".join(bad) + f"\nInstall from {REQUIREMENTS}.")
    talib = _talib()
    c_ver = talib.__ta_version__
    c_ver = c_ver.decode() if isinstance(c_ver, bytes) else str(c_ver)
    # The C library reports its wheel's build time after the version ("0.8.1 (Sep 21 2026 16:39:26)"),
    # and each platform's wheel was built at a different second: record the version alone.
    c_ver = c_ver.split(" (", 1)[0]
    return {
        "ta-lib": md.version("ta-lib"),
        "ta-lib-c": c_ver,
        "pandas-ta-classic": md.version("pandas-ta-classic"),
        "pandas-ta": md.version("pandas-ta"),
        "numpy": md.version("numpy"),
        "pandas": md.version("pandas"),
        "python": ".".join(map(str, sys.version_info[:3])),
    }


# --------------------------------------------------------------------------- write


def _num(v: float) -> str:
    # NaN and an infinity are both "no value": a spec returns null for each
    # (catalog.test.ts refuses a non-finite number). PORTING.md § Nulls.
    if math.isnan(v) or math.isinf(v):
        return "null"
    return repr(float(v))


def render_fixture(catalogue_id: str, oracle: Oracle, cases: list[Case], bars: Bars, versions: dict[str, str]) -> str:
    n = len(bars["close"])
    lines = [
        "{",
        f'  "catalogueId": {json.dumps(catalogue_id)},',
        f'  "library": {json.dumps(oracle.library)},',
        f'  "versions": {json.dumps(versions)},',
        '  "generator": "oracle/generate.py",',
        f'  "bars": {json.dumps({"file": BARS_FILE.name, "count": n, "valuesSha256": bars_sha256(bars)})},',
    ]
    if oracle.note:
        lines.append(f'  "note": {json.dumps(oracle.note)},')
    lines.append('  "cases": [')
    for ci, c in enumerate(cases):
        lines.append("    {")
        lines.append(f'      "settings": {json.dumps(c.settings)},')
        lines.append(f'      "entry": {json.dumps(c.entry)},')
        lines.append(f'      "call": {json.dumps(c.call)},')
        lines.append(f'      "inputs": {json.dumps(c.inputs)},')
        lines.append('      "outputs": {')
        keys = list(c.outputs)
        for ki, k in enumerate(keys):
            arr = c.outputs[k]
            if len(arr) != n:
                raise ValueError(f"{catalogue_id}: output {k} has {len(arr)} values for {n} bars")
            infs = np.flatnonzero(np.isinf(arr))
            if len(infs):
                print(f"  note: {catalogue_id} case {ci} output {k}: the library returned an infinity at bars {infs[:12].tolist()}, written as null", file=sys.stderr)
            body = ",".join(_num(v) for v in arr)
            lines.append(f'        {json.dumps(k)}: [{body}]' + ("," if ki < len(keys) - 1 else ""))
        lines.append("      }")
        lines.append("    }" + ("," if ci < len(cases) - 1 else ""))
    lines.append("  ]")
    lines.append("}")
    return "\n".join(lines) + "\n"


def fixture_path(catalogue_id: str, fixture_dir: str = "") -> Path:
    return (FIXTURES / fixture_dir if fixture_dir else FIXTURES) / f"{catalogue_id}.json"


# Two platforms' maths libraries can round the last bits of a logarithm, a sine or a
# square root differently (Linux against Windows: at most 2e-12 on the fixtures).
# A check accepts that and nothing more: the same text, or the same JSON with every
# number within 1e-10 of the fixture's (relative to the larger of 1 and the value).
FLOAT_TOLERANCE = 1e-10


def _same_value(a: object, b: object) -> bool:
    if isinstance(a, bool) or isinstance(b, bool):
        return a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return a == b or abs(a - b) <= FLOAT_TOLERANCE * max(1.0, abs(a), abs(b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_same_value(a[k], b[k]) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_same_value(x, y) for x, y in zip(a, b))
    return a == b


def fixture_matches(on_disk: str, computed: str) -> bool:
    """True when the fixture on disk is what the oracle computes, up to the platforms' last bits."""
    return on_disk == computed or _same_value(json.loads(on_disk), json.loads(computed))


def write_fixture(catalogue_id: str, text: str, fixture_dir: str = "") -> Path:
    path = fixture_path(catalogue_id, fixture_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(text, encoding="utf-8", newline="\n")
    tmp.replace(path)
    return path
