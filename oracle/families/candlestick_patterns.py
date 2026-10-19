"""Oracles for the candlestick patterns family (catalog/candlestick_patterns), part 0.

TA-Lib's patterns, called through talib_oracle with TA-Lib's default candle
settings. PORTING.md § 15 holds the conventions; parts a, b and c of the
family live in candlestick_patterns_a.py, _b.py and _c.py, and import
`pattern` from here.

The shared oracle bars rarely form a multi-candle pattern (the bars move in
small steps, each opening on the last close), so this file also writes the
family's stress bars, run directly:

    "$LOCALAPPDATA/algolift/indicator-oracle-venv/Scripts/python.exe" -I oracle/families/candlestick_patterns.py

It builds seeded bars made to form every pattern (gaps, dojis, marubozus,
long shadows, equal opens and closes, a flat stretch, prices on a binary
grid and on a decimal one) and writes every TA-Lib pattern's output on them
to catalog/candlestick_patterns/__fixtures__/stress.json, which
candlestick_patterns/__tests__/stress.test.ts holds every ported pattern to,
exactly.
"""

import sys
from pathlib import Path

if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np  # noqa: E402

from oraclelib import Oracle, talib_oracle  # noqa: E402

# Settings in the spec's names: a pattern without settings repeats its
# defaults (PORTING.md § 6 allows it where nothing varies).
NO_SETTINGS = [{}, {}, {}]


def _lookback(name: str, settings: dict) -> int:
    """TA-Lib's own TA_CDL<NAME>_Lookback for these settings."""
    import talib.abstract  # noqa: PLC0415

    f = talib.abstract.Function(name)
    params = {k: v for k, v in settings.items() if k in f.info["parameters"]}
    if params:
        f.parameters = params
    return int(f.lookback)


def _lookback_as_nan(oracle: Oracle, name: str) -> Oracle:
    """The same oracle with the first `lookback` bars NaN.

    TA-Lib's C writes nothing before its lookback; the Python wrapper fills
    those bars with 0, which would read as "judged, no pattern". The spec
    returns null there, so the fixture does too.
    """

    def run(bars, s):
        entry, call, inputs, outputs = oracle.run(bars, s)
        lb = _lookback(name, s)
        out = {}
        for k, v in outputs.items():
            v = np.asarray(v, dtype=np.float64).copy()
            v[: min(lb, len(v))] = np.nan
            out[k] = v
        return entry, call, inputs, out

    return Oracle(oracle.library, run, oracle.cases, oracle.check_defaults, oracle.note)


def pattern(name: str, cases=None, penetration: bool = False, note: str = "") -> Oracle:
    """One TA-Lib pattern: `name` is the function (CDLHAMMER).

    Without `penetration`, the three identical default cases. With it, the
    cases must be given, the first at TA-Lib's default penetration.
    """
    if penetration and not cases:
        raise ValueError(f"{name}: a pattern with a penetration names its cases")
    # The only setting a pattern has; a case without it passes nothing.
    params = {"penetration": "penetration"}
    o = talib_oracle(name, cases=cases if cases is not None else NO_SETTINGS, params=params, note=note)
    return _lookback_as_nan(o, name)


ORACLES = {
    "cdl_doji": pattern("CDLDOJI"),
    "cdl_dragonflydoji": pattern("CDLDRAGONFLYDOJI"),
    "cdl_gravestonedoji": pattern("CDLGRAVESTONEDOJI"),
    "cdl_hammer": pattern("CDLHAMMER"),
    "cdl_engulfing": pattern("CDLENGULFING"),
    "cdl_marubozu": pattern("CDLMARUBOZU"),
    "cdl_shootingstar": pattern("CDLSHOOTINGSTAR"),
    "cdl_spinningtop": pattern("CDLSPINNINGTOP"),
    # TA-Lib's default penetration is 0.3; 0 asks only for a close beyond the
    # first candle's close, 0.6 for a close deep into its body.
    "cdl_morningstar": pattern("CDLMORNINGSTAR", penetration=True, cases=[
        {"penetration": 0.3},
        {"penetration": 0.0},
        {"penetration": 0.6},
    ]),
    "cdl_eveningstar": pattern("CDLEVENINGSTAR", penetration=True, cases=[
        {"penetration": 0.3},
        {"penetration": 0.0},
        {"penetration": 0.6},
    ]),
}


# --------------------------------------------------------------- the stress bars

STRESS_FILE = Path(__file__).resolve().parents[2] / "fixtures" / "candlestick_stress.json"
STRESS_SEED = 20261013
STRESS_BARS = 8000


# Hand-made patterns the random bars rarely form, as (open, high, low, close)
# relative to the last close, in units where 4 is a long body and 0 a missing
# shadow. Each is read off the pattern's C at v0.8.1.
TEMPLATES = [
    [(0, 3.5, -0.25, 3), (3, 3.25, 1, 1), (2, 2, 0, 0), (1, 1.25, -1, -1)],  # three black crows
    [(3, 3, -3.5, 0), (1.5, 1.5, -1, 0.25), (0, 0, -0.5, -0.5)],  # three stars in the south
    [(4, 4, 0, 0), (-0.5, -0.5, -1.75, -1.5), (-1, -0.75, -2.25, -2), (-1.5, -1.25, -2.75, -2.5), (-2.5, -0.25, -2.5, -0.25)],  # breakaway
    [(3, 3, 1, 1), (1, 1, -1, -1), (-1.5, -0.5, -2.5, -2.5), (0, 0, -3, -3)],  # concealing baby swallow
    [(4, 4.25, -0.25, 0), (-1, 0, -1, 0)],  # in-neck
    [(0, 4, 0, 4), (5, 5, 4.5, 4.5), (4.5, 4.5, 3.75, 3.75), (4.25, 4.25, 3.5, 3.5), (3.75, 6, 3.75, 6)],  # mat hold
    [(0, 4, 0, 4), (3.75, 3.75, 3.25, 3.25), (3.25, 3.25, 2.75, 2.75), (2.75, 2.75, 2.25, 2.25), (2.5, 5, 2.5, 5)],  # rising three methods
    [(0, 4, 0, 4), (5, 5, 4.5, 4.5), (5.5, 5.5, 4.25, 4.25)],  # upside gap two crows
    [(0, 2, 0, 2), (2.5, 4, 2.5, 4), (3, 3, 1, 1)],  # upside gap three methods
    [(0, 4, 0, 4), (5.5, 5.75, 4.75, 4.75), (5, 5, 2, 2)],  # two crows
    [(0, 1.5, 0, 1.5), (1, 3, 1, 3), (2.5, 4.5, 2.5, 4.5), (5, 5, -0.5, -0.5)],  # three-line strike
    [(4, 4, 0, 0), (5, 9, 5, 9)],  # kicking, the white marubozu longer
    [(8, 8, 0, 0), (9, 12, 9, 12)],  # kicking, the black marubozu longer
    [(4, 4, 0, 0), (-4, 0, -4, 0)],  # counterattack
    [(4, 4.25, -0.25, 0), (-1.5, -0.25, -1.5, -0.25)],  # on-neck
    [(4, 4, 0, 0), (-1, 3, -1, 3)],  # piercing
    [(4, 4, 0, 0), (-1, -0.75, -1.25, -1), (-0.5, 2.5, -0.5, 2.5)],  # abandoned baby, morning doji star
    [(6, 6, 4, 4), (5, 5, 3, 3), (4, 4, 2, 2), (2.5, 3.5, 1.5, 2), (3, 4, 3, 4)],  # ladder bottom
    [(0, 2, 0, 2), (3, 4.5, 3, 4.5), (4, 4, 2.5, 2.5)],  # tasuki gap
    [(4, 4, 0, 0), (-1, 1.5, -1, 1.5)],  # thrusting
]


def stress_bars(seed: int = STRESS_SEED, n: int = STRESS_BARS) -> dict:
    """Seeded OHLC bars made to form candlestick patterns.

    Regimes of 3 to 12 bars (up, down, flat-ish, inside, repeated candles)
    drive the colour and size of each body; opens sit on the last close,
    gap away from it, or land inside the last body; shadows are absent,
    short or long; about a third of the regimes are one of TEMPLATES, maybe
    mirrored. The first half is on a 0.25 grid (sums exact in binary),
    the second rounded to 0.01 (sums that round, as real prices do). Bars
    1000 to 1019 are one flat price (no body, no range).
    """
    rng = np.random.default_rng(seed)
    o = np.empty(n)
    h = np.empty(n)
    lo = np.empty(n)
    c = np.empty(n)
    unit = 1.0
    prev_o, prev_c = 100.0, 100.0
    i = 0
    last_plant = -100
    while i < n:
        if i - last_plant > 15 and not (980 <= i < 1030) and rng.random() < 0.35:
            # A planted pattern, maybe mirrored (a bullish one becomes bearish).
            tpl = TEMPLATES[int(rng.integers(0, len(TEMPLATES)))]
            k = rng.choice([1.0, 1.25, 1.37]) * unit
            mirror = rng.random() < 0.5
            base = prev_c
            for (to, th, tl, tc) in tpl:
                if i >= n:
                    break
                if mirror:
                    to, th, tl, tc = -to, -tl, -th, -tc
                vals = [base + v * k for v in (to, th, tl, tc)]
                if i >= n // 2:
                    vals = [round(v, 2) for v in vals]
                else:
                    vals = [round(v * 4) / 4 for v in vals]
                o[i], h[i], lo[i], c[i] = vals
                prev_o, prev_c = o[i], c[i]
                i += 1
            last_plant = i
            continue
        regime = rng.choice(["up", "down", "chop", "inside", "repeat", "star"], p=[0.25, 0.25, 0.2, 0.1, 0.1, 0.1])
        length = int(rng.integers(3, 13))
        for _ in range(length):
            if i >= n:
                break
            if 1000 <= i < 1020:
                o[i] = h[i] = lo[i] = c[i] = prev_c
                prev_o = prev_c
                i += 1
                continue
            if regime == "repeat" and i > 0 and rng.random() < 0.6:
                # The same candle again, or the same open or close (equal-level patterns).
                k = rng.integers(0, 3)
                if k == 0:
                    o[i], h[i], lo[i], c[i] = o[i - 1], h[i - 1], lo[i - 1], c[i - 1]
                    prev_o, prev_c = o[i], c[i]
                    i += 1
                    continue
            # The open: on the last close, inside the last body, or a gap.
            r = rng.random()
            span = abs(prev_c - prev_o) + unit
            if r < 0.45:
                op = prev_c
            elif r < 0.6:
                op = min(prev_o, prev_c) + rng.random() * abs(prev_c - prev_o)
            elif r < 0.7:
                op = prev_o
            else:
                op = prev_c + (1 if rng.random() < 0.5 else -1) * rng.choice([0.5, 1.0, 2.0, 4.0]) * span
            # The body: doji, short, long or very long, its colour from the regime.
            size = rng.choice([0.0, 0.02, 0.3, 1.0, 2.0, 4.0], p=[0.12, 0.08, 0.25, 0.3, 0.17, 0.08]) * unit * rng.uniform(0.5, 1.5)
            if regime == "up":
                sign = 1 if rng.random() < 0.8 else -1
            elif regime == "down":
                sign = -1 if rng.random() < 0.8 else 1
            elif regime == "inside":
                sign = -np.sign(prev_c - prev_o) or 1
                size = min(size, 0.6 * abs(prev_c - prev_o))
            elif regime == "star":
                sign = 1 if rng.random() < 0.5 else -1
                size = size * (0.1 if rng.random() < 0.5 else 3.0)
            else:
                sign = 1 if rng.random() < 0.5 else -1
            cl = op + sign * size
            # The shadows: none, very short, short, as long as the body, very long.
            def shadow():
                return rng.choice([0.0, 0.02, 0.3, 1.0, 3.0], p=[0.3, 0.15, 0.25, 0.2, 0.1]) * unit * rng.uniform(0.5, 1.5)
            hi = max(op, cl) + shadow()
            lw = min(op, cl) - shadow()
            if i >= n // 2:
                op, hi, lw, cl = (round(v, 2) for v in (op, hi, lw, cl))
            else:
                op, hi, lw, cl = (round(v * 4) / 4 for v in (op, hi, lw, cl))
            hi = max(hi, op, cl)
            lw = min(lw, op, cl)
            o[i], h[i], lo[i], c[i] = op, hi, lw, cl
            prev_o, prev_c = op, cl
            i += 1
    return {"open": o, "high": h, "low": lo, "close": c}


def write_stress() -> None:
    import json  # noqa: PLC0415

    import talib  # noqa: PLC0415
    import talib.abstract  # noqa: PLC0415

    import oraclelib  # noqa: PLC0415

    versions = oraclelib.check_versions()
    bars = stress_bars()
    n = len(bars["close"])
    functions = {}
    for name in talib.get_function_groups()["Pattern Recognition"]:
        info = talib.abstract.Function(name).info
        cases = [{}]
        if "penetration" in info["parameters"]:
            d = info["parameters"]["penetration"]
            cases = [{"penetration": d}, {"penetration": 0.0}, {"penetration": 0.6}, {"penetration": 1.0}]
        out = []
        for s in cases:
            res = getattr(talib, name)(bars["open"], bars["high"], bars["low"], bars["close"], **s)
            lb = _lookback(name, s)
            # Sparse: the lookback, then every bar with a signal.
            signals = {str(j): int(res[j]) for j in range(lb, n) if res[j] != 0}
            out.append({"settings": s, "lookback": lb, "signals": signals})
        functions[name] = out
    doc = {
        "about": "TA-Lib's candlestick patterns on the family's stress bars (oracle/families/candlestick_patterns.py). Null before `lookback`, the signal where `signals` lists the bar, 0 elsewhere.",
        "versions": versions,
        "seed": STRESS_SEED,
        "count": n,
        "bars": {k: [float(v) for v in bars[k]] for k in ("open", "high", "low", "close")},
        "functions": functions,
    }
    STRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = STRESS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(doc, separators=(",", ":")) + chr(10), encoding="utf-8", newline="")
    tmp.replace(STRESS_FILE)
    fired = {k: sum(len(c["signals"]) for c in v) for k, v in functions.items()}
    print(f"wrote {STRESS_FILE} ({n} bars, {len(functions)} patterns)")
    for k, v in sorted(fired.items(), key=lambda x: x[1]):
        print(f"  {k:22} {v}")


if __name__ == "__main__":
    write_stress()
