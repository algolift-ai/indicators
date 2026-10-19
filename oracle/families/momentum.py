"""Oracles for the momentum family (catalog/momentum)."""

import numpy as np

from oraclelib import Oracle, ptac_oracle, pta_oracle, source, talib_oracle

# ROC's `unit` setting picks one of TA-Lib's four functions.
ROC_UNITS = {"percent": "ROC", "fraction": "ROCP", "ratio": "ROCR", "ratio100": "ROCR100"}

HLC = ("high", "low", "close")
OHLC = ("open_", "high", "low", "close")


def _dm_oracle() -> Oracle:
    """+DM and -DM are two TA-Lib functions; the study draws both, so one oracle calls each."""
    import talib  # noqa: PLC0415

    def run(bars, s):
        call = {"timeperiod": s["period"]}
        plus = talib.PLUS_DM(bars["high"], bars["low"], **call)
        minus = talib.MINUS_DM(bars["high"], bars["low"], **call)
        return "PLUS_DM, MINUS_DM", call, ["high", "low"], {"plus": plus, "minus": minus}

    def check(s):
        for f in ("PLUS_DM", "MINUS_DM"):
            d = dict(talib.abstract.Function(f).info["parameters"])["timeperiod"]
            if s["period"] != d:
                raise ValueError(f"{f}: cases[0] sets period={s['period']}, TA-Lib's default is {d}")

    return Oracle(
        "TA-Lib",
        run,
        [{"period": 14}, {"period": 1}, {"period": 50}],
        check,
        note="TA-Lib's PLUS_DM and MINUS_DM, called once each per case: the study draws them as one.",
    )


def _crsi_oracle() -> Oracle:
    """Connors RSI from pandas-ta's own rsi() and percent_rank(), with Connors' streak.

    pandas-ta 0.4.71b0's crsi() feeds rsi() the SIGN of each change
    (utils/_math.consecutive_streak returns sign(diff(x))), not the streak
    Connors defines (+1, +2, +3 for consecutive up closes, -1, -2 ... for down
    closes, 0 for an unchanged close). The spec computes Connors' streak, so its
    oracle is the library's crsi() arithmetic with that one input corrected:
    the same rsi() (pandas-ta, talib=False), the same percent_rank(), the same
    (a + b + c) / 3.0.
    """
    import pandas as pd  # noqa: PLC0415

    def streak(x):
        out = np.zeros(len(x))
        for i in range(1, len(x)):
            if x[i] > x[i - 1]:
                out[i] = out[i - 1] + 1 if out[i - 1] > 0 else 1
            elif x[i] < x[i - 1]:
                out[i] = out[i - 1] - 1 if out[i - 1] < 0 else -1
        return out

    def run(bars, s):
        from pandas_ta.momentum import rsi  # noqa: PLC0415
        from pandas_ta.utils import percent_rank  # noqa: PLC0415

        src = s.get("source", "close")
        close = pd.Series(source(bars, src))
        a = rsi(close, length=s["rsi_period"], talib=False)
        b = rsi(pd.Series(streak(close.to_numpy())), length=s["streak_period"], talib=False)
        c = percent_rank(close, s["rank_period"])
        value = (a + b + c) / 3.0
        call = {"rsi_length": s["rsi_period"], "streak_length": s["streak_period"], "rank_length": s["rank_period"]}
        return "crsi (Connors' streak)", call, [src], {"value": value.to_numpy(dtype=np.float64)}

    def check(s):
        # crsi()'s body: rsi_length 3, streak_length 2, rank_length 100.
        if (s["rsi_period"], s["streak_period"], s["rank_period"], s.get("source", "close")) != (3, 2, 100, "close"):
            raise ValueError("crsi: cases[0] must be the library's defaults (3, 2, 100, close)")

    return Oracle(
        "pandas-ta",
        run,
        [
            {"rsi_period": 3, "streak_period": 2, "rank_period": 100, "source": "close"},
            {"rsi_period": 5, "streak_period": 3, "rank_period": 50, "source": "close"},
            {"rsi_period": 2, "streak_period": 2, "rank_period": 20, "source": "hlc3"},
        ],
        check,
        note="pandas-ta's rsi() and percent_rank() with Connors' streak (the library's crsi() passes the sign of each change instead); see families/momentum.py.",
    )


def _kst_oracle() -> Oracle:
    """KST on Pring's scale: pandas-ta-classic's kst() with its extra x100 taken out.

    The library's rates of change are already percents (momentum/roc), and kst()
    multiplies their weighted sum by 100 again, so its KST reads 100 times
    Pring's. The spec drops that factor (ruling 2026-10-13), so its oracle is the
    library's own output, both lines, divided by 100.
    """
    base = ptac_oracle(
        "kst",
        params={k: k for k in ("roc1", "roc2", "roc3", "roc4", "sma1", "sma2", "sma3", "sma4", "signal")},
        outputs={"value": 0, "signal": 1},
        cases=[
            {"roc1": 10, "roc2": 15, "roc3": 20, "roc4": 30, "sma1": 10, "sma2": 10, "sma3": 10, "sma4": 15, "signal": 9, "source": "close"},  # the body's defaults
            {"roc1": 2, "roc2": 3, "roc3": 4, "roc4": 5, "sma1": 2, "sma2": 2, "sma3": 3, "sma4": 3, "signal": 2, "source": "close"},
            {"roc1": 20, "roc2": 30, "roc3": 40, "roc4": 60, "sma1": 15, "sma2": 15, "sma3": 20, "sma4": 25, "signal": 12, "source": "hl2"},
        ],
    )

    def run(bars, s):
        entry, call, inputs, out = base.run(bars, s)
        return f"{entry} / 100", call, inputs, {k: np.asarray(v, dtype=np.float64) / 100.0 for k, v in out.items()}

    return Oracle(
        base.library,
        run,
        base.cases,
        base.check_defaults,
        note="pandas-ta-classic's kst() with both lines divided by 100: the library multiplies its percent rates of change by 100 again, and the spec reads on Pring's scale; see families/momentum.py.",
    )


ORACLES = {
    "mom": talib_oracle(
        "MOM",
        cases=[
            {"period": 10, "source": "close"},
            {"period": 1, "source": "close"},
            {"period": 25, "source": "hl2"},
        ],
    ),
    "roc": talib_oracle(
        lambda s: ROC_UNITS[s["unit"]],
        cases=[
            {"period": 10, "unit": "percent", "source": "close"},
            {"period": 5, "unit": "fraction", "source": "close"},
            {"period": 20, "unit": "ratio", "source": "close"},
            {"period": 1, "unit": "ratio100", "source": "hl2"},
        ],
    ),
    # TA-Lib's APO with its default MA type, 1 (EMA).
    "apo": talib_oracle(
        "APO",
        params={"fast": "fastperiod", "slow": "slowperiod"},
        cases=[
            {"fast": 12, "slow": 26, "source": "close"},
            {"fast": 3, "slow": 10, "source": "hl2"},
            {"fast": 40, "slow": 15, "source": "close"},  # slow below fast: TA-Lib swaps them
        ],
    ),
    "ao": ptac_oracle(
        "ao",
        inputs=("high", "low"),
        params={"fast": "fast", "slow": "slow"},
        cases=[
            {"fast": 5, "slow": 34},  # the body's defaults
            {"fast": 2, "slow": 10},
            {"fast": 60, "slow": 20},  # slow below fast: the library swaps them
        ],
    ),
    "bop": talib_oracle(
        "BOP",
        params={},
        cases=[{}, {}, {}],
        note="BOP has no settings: its three cases are the same call.",
    ),
    "bias": ptac_oracle(
        "bias",
        cases=[
            {"period": 26, "source": "close"},  # the body's default
            {"period": 5, "source": "close"},
            {"period": 100, "source": "hlc3"},
        ],
    ),
    "brar": ptac_oracle(
        "brar",
        inputs=OHLC,
        outputs={"ar": 0, "br": 1},
        cases=[{"period": 26}, {"period": 5}, {"period": 100}],  # the body's default 26
    ),
    "cfo": ptac_oracle(
        "cfo",
        cases=[
            {"period": 9, "source": "close"},  # the body's default
            {"period": 2, "source": "close"},
            {"period": 50, "source": "hl2"},
        ],
    ),
    "crsi": _crsi_oracle(),
    "coppock": ptac_oracle(
        "coppock",
        params={"period": "length", "fast": "fast", "slow": "slow"},
        cases=[
            {"period": 10, "fast": 11, "slow": 14, "source": "close"},  # the body's defaults
            {"period": 3, "fast": 2, "slow": 5, "source": "close"},
            {"period": 20, "fast": 25, "slow": 40, "source": "ohlc4"},
        ],
    ),
    "cti": ptac_oracle(
        "cti",
        cases=[
            {"period": 12, "source": "close"},  # the body's default
            {"period": 2, "source": "close"},
            {"period": 60, "source": "hl2"},
        ],
    ),
    "dm": _dm_oracle(),
    "er": ptac_oracle(
        "er",
        cases=[
            {"period": 10, "source": "close"},  # the body's default
            {"period": 2, "source": "close"},
            {"period": 60, "source": "hlc3"},
        ],
    ),
    "eri": ptac_oracle(
        "eri",
        inputs=HLC,
        outputs={"bull": 0, "bear": 1},
        cases=[{"period": 13}, {"period": 2}, {"period": 60}],  # the body's default 13
    ),
    "exhc": pta_oracle(
        "exhc",
        params={"period": "length", "cap": "cap"},
        outputs={"down": 0, "up": 1},
        cases=[
            {"period": 4, "cap": 13, "source": "close"},  # the body's defaults
            {"period": 1, "cap": 0, "source": "close"},  # cap 0: no cap
            {"period": 10, "cap": 5, "source": "hl2"},
        ],
    ),
    "inertia": ptac_oracle(
        "inertia",
        params={"period": "length", "rvi_period": "rvi_length"},
        cases=[
            {"period": 20, "rvi_period": 14, "source": "close"},  # the body's defaults
            {"period": 5, "rvi_period": 3, "source": "close"},
            {"period": 50, "rvi_period": 30, "source": "hlc3"},
        ],
    ),
    "kdj": ptac_oracle(
        "kdj",
        inputs=HLC,
        params={"period": "length", "signal": "signal"},
        outputs={"k": 0, "d": 1, "j": 2},
        cases=[
            {"period": 9, "signal": 3},  # the body's defaults
            {"period": 3, "signal": 1},
            {"period": 40, "signal": 8},
        ],
    ),
    "kst": _kst_oracle(),
    "lrsi": ptac_oracle(
        "lrsi",
        params={"gamma": "gamma"},
        cases=[
            {"gamma": 0.5, "source": "close"},  # the body's default
            {"gamma": 0.2, "source": "close"},
            {"gamma": 0.85, "source": "hl2"},
        ],
    ),
    "pgo": ptac_oracle(
        "pgo",
        inputs=HLC,
        cases=[{"period": 14}, {"period": 2}, {"period": 60}],  # the body's default 14
    ),
    "po": ptac_oracle(
        "po",
        cases=[
            {"period": 14, "source": "close"},  # the body's default
            {"period": 2, "source": "close"},
            {"period": 60, "source": "ohlc4"},
        ],
    ),
    "psl": ptac_oracle(
        "psl",
        cases=[
            {"period": 12, "source": "close"},  # the body's default
            {"period": 1, "source": "close"},
            {"period": 60, "source": "hl2"},
        ],
    ),
    # Concept provenance: the spec is written from the published formula; the
    # library is only the oracle (PORTING.md § 0).
    "rvgi": ptac_oracle(
        "rvgi",
        inputs=OHLC,
        params={"period": "length", "smooth": "swma_length"},
        outputs={"histogram": 0, "value": 1, "signal": 2},
        cases=[
            {"period": 14, "smooth": 4},  # the body's defaults
            {"period": 3, "smooth": 1},
            {"period": 50, "smooth": 7},
        ],
    ),
    "stc": ptac_oracle(
        "stc",
        params={"cycle": "tclength", "fast": "fast", "slow": "slow", "factor": "factor"},
        outputs={"value": 0, "macd": 1, "stoch": 2},
        cases=[
            {"cycle": 10, "fast": 12, "slow": 26, "factor": 0.5, "source": "close"},  # the body's defaults
            {"cycle": 3, "fast": 5, "slow": 10, "factor": 0.25, "source": "close"},
            {"cycle": 20, "fast": 40, "slow": 20, "factor": 0.8, "source": "hlc3"},  # slow below fast: swapped
        ],
    ),
    "seq_count": ptac_oracle(
        "td_seq",
        params={},
        outputs={"up": 0, "down": 1},
        cases=[{"source": "close"}, {"source": "hl2"}, {"source": "open"}],
        note="pandas-ta-classic's td_seq; its only setting here is the source.",
    ),
    "slope": ptac_oracle(
        "slope",
        cases=[
            {"period": 1, "source": "close"},  # the body's default
            {"period": 5, "source": "close"},
            {"period": 50, "source": "hl2"},
        ],
    ),
    "smi": ptac_oracle(
        "smi",
        params={"fast": "fast", "slow": "slow", "signal": "signal"},
        outputs={"value": 0, "signal": 1, "histogram": 2},
        cases=[
            {"fast": 5, "slow": 20, "signal": 5, "source": "close"},  # the body's defaults
            {"fast": 2, "slow": 4, "signal": 2, "source": "close"},
            {"fast": 40, "slow": 13, "signal": 10, "source": "hl2"},  # slow below fast: swapped
        ],
    ),
    "squeeze": ptac_oracle(
        "squeeze",
        inputs=HLC,
        params={
            "bb_period": "bb_length",
            "bb_multiplier": "bb_std",
            "kc_period": "kc_length",
            "kc_multiplier": "kc_scalar",
            "mom_period": "mom_length",
            "mom_smooth": "mom_smooth",
        },
        outputs={"value": 0, "on": 1, "off": 2, "no": 3},
        cases=[
            {"bb_period": 20, "bb_multiplier": 2.0, "kc_period": 20, "kc_multiplier": 1.5, "mom_period": 12, "mom_smooth": 6},  # the body's defaults
            {"bb_period": 5, "bb_multiplier": 1.0, "kc_period": 8, "kc_multiplier": 1.0, "mom_period": 3, "mom_smooth": 2},
            {"bb_period": 40, "bb_multiplier": 2.5, "kc_period": 30, "kc_multiplier": 2.0, "mom_period": 25, "mom_smooth": 10},
        ],
    ),
    "squeeze_pro": ptac_oracle(
        "squeeze_pro",
        inputs=HLC,
        params={
            "bb_period": "bb_length",
            "bb_multiplier": "bb_std",
            "kc_period": "kc_length",
            "kc_wide": "kc_scalar_wide",
            "kc_normal": "kc_scalar_normal",
            "kc_narrow": "kc_scalar_narrow",
            "mom_period": "mom_length",
            "mom_smooth": "mom_smooth",
        },
        outputs={"value": 0, "on_wide": 1, "on_normal": 2, "on_narrow": 3, "off": 4, "no": 5},
        cases=[
            {"bb_period": 20, "bb_multiplier": 2.0, "kc_period": 20, "kc_wide": 2.0, "kc_normal": 1.5, "kc_narrow": 1.0, "mom_period": 12, "mom_smooth": 6},  # the body's defaults
            {"bb_period": 5, "bb_multiplier": 1.0, "kc_period": 8, "kc_wide": 1.5, "kc_normal": 1.0, "kc_narrow": 0.5, "mom_period": 3, "mom_smooth": 2},
            {"bb_period": 40, "bb_multiplier": 2.5, "kc_period": 30, "kc_wide": 3.0, "kc_normal": 2.0, "kc_narrow": 1.2, "mom_period": 25, "mom_smooth": 10},
        ],
    ),
    # pandas-ta's tmo() calls ma("ema") without talib, so its averages are TA-Lib's EMA.
    "tmo": pta_oracle(
        "tmo",
        inputs=("open_", "close"),
        params={"period": "tmo_length", "calc_period": "calc_length", "smooth": "smooth_length"},
        outputs={"value": 0, "signal": 1},
        cases=[
            {"period": 14, "calc_period": 5, "smooth": 3},  # the body's defaults
            {"period": 4, "calc_period": 2, "smooth": 2},
            {"period": 40, "calc_period": 10, "smooth": 6},
        ],
    ),
    "vwmacd": ptac_oracle(
        "vwmacd",
        inputs=("close", "volume"),
        params={"fast": "fast", "slow": "slow", "signal": "signal"},
        outputs={"value": 0, "histogram": 1, "signal": 2},
        cases=[
            {"fast": 12, "slow": 26, "signal": 9},  # the body's defaults
            {"fast": 3, "slow": 8, "signal": 2},
            {"fast": 40, "slow": 20, "signal": 15},  # slow below fast: swapped
        ],
    ),
}
