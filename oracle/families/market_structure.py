"""Oracles for the market structure family (catalog/market_structure)."""

from __future__ import annotations

import numpy as np

from oraclelib import Oracle

# The CPR spec's outputs and the library's columns.
CPR_COLUMNS = {
    "tc": "CPR_TC",
    "pivot": "CPR_PIVOT",
    "bc": "CPR_BC",
    "r1": "CPR_R1",
    "r2": "CPR_R2",
    "r3": "CPR_R3",
    "r4": "CPR_R4",
    "s1": "CPR_S1",
    "s2": "CPR_S2",
    "s3": "CPR_S3",
    "s4": "CPR_S4",
    "width": "CPR_WIDTH",
    "width_pct": "CPR_WIDTH_PCT",
    "width_class": "CPR_WIDTH_CLASS",
    "position": "CPR_POSITION",
}


def _series(bars, col):
    import pandas as pd  # noqa: PLC0415

    return pd.Series(bars[col])


def _cpr() -> Oracle:
    """pandas-ta-classic cpr, its daily timeframe, every level a method defines.

    The fixture bars carry no timestamps, so only the library's `daily`
    timeframe (the previous ROW's high, low and close) runs here; its weekly,
    monthly and intraday modes resample by the index's dates. levels='all' so
    every level the method computes is a column; a level the method does not
    define (Woodie's R3, Fibonacci's R4) is NaN on every bar, as the spec
    returns it null. width_narrow / width_wide are kwargs popped in the body
    with defaults 0.5 and 1.5.
    """
    import inspect  # noqa: PLC0415

    def run(bars, s):
        import pandas_ta_classic as ptac  # noqa: PLC0415

        call = {"method": s["method"], "timeframe": "daily", "levels": "all", "width_narrow": s["narrow_width"], "width_wide": s["wide_width"]}
        res = ptac.cpr(_series(bars, "open"), _series(bars, "high"), _series(bars, "low"), _series(bars, "close"), **call)
        n = len(bars["close"])
        out = {}
        for spec, col in CPR_COLUMNS.items():
            out[spec] = res[col].to_numpy(dtype=np.float64, na_value=np.nan) if col in res.columns else np.full(n, np.nan)
        return "cpr", call, ["open", "high", "low", "close"], out

    def check(s):
        import pandas_ta_classic as ptac  # noqa: PLC0415

        sig = inspect.signature(ptac.cpr)
        if s["method"] != sig.parameters["method"].default:
            raise ValueError(f"cpr: cases[0] method {s['method']!r}, the library's is {sig.parameters['method'].default!r}")
        if (s["narrow_width"], s["wide_width"]) != (0.5, 1.5):
            raise ValueError("cpr: cases[0] widths must be the body's 0.5 and 1.5")

    return Oracle(
        "pandas-ta-classic",
        run,
        [
            {"method": "classic", "narrow_width": 0.5, "wide_width": 1.5},
            {"method": "camarilla", "narrow_width": 0.5, "wide_width": 1.5},
            {"method": "fibonacci", "narrow_width": 2.0, "wide_width": 4.0},
            {"method": "woodie", "narrow_width": 1.0, "wide_width": 3.0},
        ],
        check,
        note="cpr with timeframe='daily' (the previous bar) and levels='all': a level the method does not define is null on every bar.",
    )


def _smc_sweep() -> Oracle:
    """pandas-ta-classic smc_sweep, its one series (+1 bull, -1 bear) read as two events.

    The library returns +1 on a bullish sweep, -1 on a bearish one and 0
    otherwise; the two can never hold on one bar (a bullish sweep closes above
    its open, a bearish one below). The spec draws each as its own 0-or-1
    event, so the oracle is (series == 1) and (series == -1).
    Defaults set in the body: length 15, wick_mult 1.5.
    """

    def run(bars, s):
        import pandas_ta_classic as ptac  # noqa: PLC0415

        call = {"length": s["period"], "wick_mult": s["wick_multiplier"]}
        res = ptac.smc_sweep(_series(bars, "open"), _series(bars, "high"), _series(bars, "low"), _series(bars, "close"), **call)
        v = res.to_numpy(dtype=np.float64)
        if np.isnan(v).any():
            raise ValueError("smc_sweep returned NaN, which the event split does not expect")
        return "smc_sweep", call, ["open", "high", "low", "close"], {"bull": (v == 1).astype(np.float64), "bear": (v == -1).astype(np.float64)}

    def check(s):
        if (s["period"], s["wick_multiplier"]) != (15, 1.5):
            raise ValueError("smc_sweep: cases[0] must be the body's defaults, length 15 and wick_mult 1.5")

    return Oracle(
        "pandas-ta-classic",
        run,
        [
            {"period": 15, "wick_multiplier": 1.5},
            {"period": 5, "wick_multiplier": 0.5},
            {"period": 50, "wick_multiplier": 1.0},
        ],
        check,
        note="smc_sweep's one series split into two events: bull = (series == 1), bear = (series == -1).",
    )


def _zigzag() -> Oracle:
    """pandas-ta 0.4.71b0 zigzag on high and low; the spec's `mode` is the library's `backtest`.

    Defaults set in the body: legs 10, deviation 5.0, backtest False. Columns
    by position: swing (1 top, -1 bottom), value, deviation.
    """

    def run(bars, s):
        import pandas_ta  # noqa: PLC0415

        call = {"legs": s["legs"], "deviation": s["deviation"], "backtest": s["mode"] == "detected"}
        res = pandas_ta.zigzag(_series(bars, "high"), _series(bars, "low"), **call)
        if res is None:
            raise ValueError(f"zigzag returned None for {s}")
        col = lambda i: res.iloc[:, i].to_numpy(dtype=np.float64, na_value=np.nan)  # noqa: E731
        return "zigzag", call, ["high", "low"], {"swing": col(0), "value": col(1), "leg_percent": col(2)}

    def check(s):
        if (s["legs"], s["deviation"], s["mode"]) != (10, 5.0, "pivot"):
            raise ValueError("zigzag: cases[0] must be the body's defaults, legs 10, deviation 5.0, backtest False")

    return Oracle(
        "pandas-ta",
        run,
        [
            {"legs": 10, "deviation": 5.0, "mode": "pivot"},
            {"legs": 4, "deviation": 1.0, "mode": "pivot"},
            {"legs": 10, "deviation": 2.0, "mode": "detected"},
            {"legs": 21, "deviation": 3.0, "mode": "detected"},
            {"legs": 30, "deviation": 1.5, "mode": "pivot"},
        ],
        check,
        note="zigzag's backtest flag is the spec's mode: 'pivot' = backtest=False, 'detected' = backtest=True.",
    )


ORACLES = {
    "cpr": _cpr(),
    "smc_sweep": _smc_sweep(),
    "zigzag": _zigzag(),
}
