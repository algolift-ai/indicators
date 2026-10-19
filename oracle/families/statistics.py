"""Oracles for the statistics family (catalog/statistics)."""

from __future__ import annotations

import numpy as np

from oraclelib import Oracle, _talib, ptac_oracle, talib_oracle

# The series a two-input study may read: the bar fields, as `source` reads them.
_SERIES = ("open", "high", "low", "close", "hl2", "hlc3", "ohlc4")


def _two_series(function: str, *, a: str, b: str, cases: list[dict], note: str = "") -> Oracle:
    """A TA-Lib function of two series (BETA, CORREL) whose cases pick both.

    talib_oracle() always feeds a two-input function its default columns
    (high and low), so the cases could never vary them. Here the spec's two
    settings, `a` (TA-Lib's inReal0) and `b` (inReal1), name the series.
    """
    from oraclelib import source  # noqa: PLC0415

    def run(bars, s):
        talib = _talib()
        call = {"timeperiod": s["period"]}
        res = getattr(talib, function)(source(bars, s[a]), source(bars, s[b]), **call)
        return function, call, [s[a], s[b]], {"value": res}

    def check(s):
        talib = _talib()
        info = talib.abstract.Function(function).info
        if s["period"] != info["parameters"]["timeperiod"]:
            raise ValueError(f"{function}: cases[0] period {s['period']} is not TA-Lib's {info['parameters']['timeperiod']}")
        defaults = list(info["input_names"].values())
        if [s[a], s[b]] != defaults:
            raise ValueError(f"{function}: cases[0] reads {[s[a], s[b]]}, TA-Lib's defaults are {defaults}")
        for k in (a, b):
            for c in cases:
                if c[k] not in _SERIES:
                    raise ValueError(f"{function}: unknown series {c[k]!r}")

    return Oracle("TA-Lib", run, cases, check, note)


def _stdev_channel() -> Oracle:
    """tos_stdevall, with the spec's period 0 meaning every bar (the library's length=None).

    With a length the library returns only the last `length` rows; they are
    put back on the full bar index, NaN before them, as the spec aligns them.
    """
    base = ptac_oracle(
        "tos_stdevall",
        params={"length": "length"},
        outputs={"middle": 0, "lower_1": 1, "upper_1": 2, "lower_2": 3, "upper_2": 4, "lower_3": 5, "upper_3": 6},
        cases=[{}],
    )

    def run(bars, s):
        lib = {"source": s["source"]}
        if s["period"]:
            lib["length"] = s["period"]
        entry, call, used, out = base.run(bars, lib)
        n = len(bars["close"])
        full = {}
        for k, v in out.items():
            arr = np.full(n, np.nan)
            arr[n - len(v):] = v
            full[k] = arr
        return entry, call, used, full

    def check(s):
        if s != {"period": 0, "source": "close"}:
            raise ValueError("tos_stdevall: cases[0] must be every bar (length=None) on close")

    return Oracle(
        "pandas-ta-classic",
        run,
        [
            {"period": 0, "source": "close"},  # length=None: one fit over every bar
            {"period": 100, "source": "close"},
            {"period": 30, "source": "hlc3"},
        ],
        check,
        "period 0 is the library's length=None (every bar). The library returns only the last `length` rows; the generator puts them back on the full bar index.",
    )


def _log_return() -> Oracle:
    """log_return, the spec's `mode` setting mapped onto the library's `cumulative` flag."""
    base = ptac_oracle(
        "log_return",
        params={"period": "length", "cumulative": "cumulative"},
        cases=[{}],
    )

    def lib(s):
        return {"period": s["period"], "cumulative": s["mode"] == "cumulative", "source": s.get("source", "close")}

    def run(bars, s):
        return base.run(bars, lib(s))

    def check(s):
        # The body's defaults: length 1, cumulative False (the signature says None).
        if (s["period"], s["mode"], s["source"]) != (1, "period", "close"):
            raise ValueError("log_return: cases[0] must be length 1, not cumulative, on close")

    return Oracle(
        "pandas-ta-classic",
        run,
        [
            {"period": 1, "mode": "period", "source": "close"},
            {"period": 10, "mode": "period", "source": "close"},
            {"period": 3, "mode": "period", "source": "hl2"},
            {"period": 1, "mode": "cumulative", "source": "close"},
        ],
        check,
    )


ORACLES = {
    # TA-Lib BETA: inReal0 the benchmark, inReal1 the series (defaults high, low).
    "beta": _two_series(
        "BETA",
        a="benchmark",
        b="series",
        cases=[
            {"period": 5, "benchmark": "high", "series": "low"},
            {"period": 20, "benchmark": "close", "series": "open"},
            {"period": 100, "benchmark": "hl2", "series": "close"},
        ],
    ),
    "correl": _two_series(
        "CORREL",
        a="series_a",
        b="series_b",
        cases=[
            {"period": 30, "series_a": "high", "series_b": "low"},
            {"period": 5, "series_a": "close", "series_b": "open"},
            {"period": 100, "series_a": "hl2", "series_b": "close"},
        ],
    ),
    # No settings but the source (the library has none but offset and fillna).
    "drawdown": ptac_oracle(
        "drawdown",
        params={},
        outputs={"value": 0, "fraction": 1, "log": 2},
        cases=[{"source": "close"}, {"source": "hlc3"}, {"source": "low"}],
    ),
    # Body defaults: length 10, base 2.0.
    "entropy": ptac_oracle(
        "entropy",
        params={"period": "length", "base": "base"},
        cases=[
            {"period": 10, "base": 2.0, "source": "close"},
            {"period": 3, "base": 10.0, "source": "close"},
            {"period": 100, "base": 2.718281828459045, "source": "hl2"},
        ],
    ),
    # Body default: length 30.
    "kurtosis": ptac_oracle(
        "kurtosis",
        cases=[{"period": 30, "source": "close"}, {"period": 4, "source": "close"}, {"period": 120, "source": "ohlc4"}],
    ),
    "log_return": _log_return(),
    # Body default: length 30.
    "mad": ptac_oracle(
        "mad",
        cases=[{"period": 30, "source": "close"}, {"period": 2, "source": "close"}, {"period": 150, "source": "hlc3"}],
    ),
    # Body default: length 30.
    "median": ptac_oracle(
        "median",
        cases=[
            {"period": 30, "source": "close"},
            {"period": 5, "source": "close"},
            {"period": 8, "source": "close"},
            {"period": 101, "source": "hl2"},
        ],
    ),
    # Body defaults: length 30, q 0.5.
    "quantile": ptac_oracle(
        "quantile",
        params={"period": "length", "q": "q"},
        cases=[
            {"period": 30, "q": 0.5, "source": "close"},
            {"period": 20, "q": 0.9, "source": "close"},
            {"period": 7, "q": 0.25, "source": "close"},
            {"period": 100, "q": 0.05, "source": "low"},
            {"period": 13, "q": 0.37, "source": "close"},
        ],
    ),
    # Body default: length 30.
    "skew": ptac_oracle(
        "skew",
        cases=[{"period": 30, "source": "close"}, {"period": 3, "source": "close"}, {"period": 120, "source": "hlc3"}],
    ),
    # TA-Lib STDDEV: timeperiod 5, nbdev 1.
    "stdev": talib_oracle(
        "STDDEV",
        params={"period": "timeperiod", "multiplier": "nbdev"},
        cases=[
            {"period": 5, "multiplier": 1.0, "source": "close"},
            {"period": 2, "multiplier": 2.0, "source": "close"},
            {"period": 120, "multiplier": 1.5, "source": "hlc3"},
        ],
    ),
    "stdev_channel": _stdev_channel(),
    # Body defaults: length 14, ddof 1.
    "stderr": ptac_oracle(
        "stderr",
        cases=[{"period": 14, "source": "close"}, {"period": 2, "source": "close"}, {"period": 100, "source": "ohlc4"}],
    ),
    # TA-Lib VAR: timeperiod 5 (its nbdev is accepted and never read).
    "variance": talib_oracle(
        "VAR",
        cases=[{"period": 5, "source": "close"}, {"period": 1, "source": "close"}, {"period": 60, "source": "hl2"}],
    ),
    # Body defaults: length 30, std 1.
    "zscore": ptac_oracle(
        "zscore",
        cases=[{"period": 30, "source": "close"}, {"period": 2, "source": "close"}, {"period": 100, "source": "open"}],
    ),
}
