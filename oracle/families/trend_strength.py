"""Oracles for the trend strength family (catalog/trend_strength)."""

from dataclasses import replace

import numpy as np

from oraclelib import Oracle, pta_oracle, ptac_oracle, talib_oracle


def translated(oracle: Oracle, values: dict) -> Oracle:
    """The same oracle, with a spec setting's choice mapped to the library's value.

    `values` is {spec parameter: {spec choice: library value}}: the spec offers
    a choice by name (DPO's "centered" / "trailing") where the library takes a
    bool. The fixture keeps the spec's settings; its `call` shows the library's.
    """
    inner_run, inner_check = oracle.run, oracle.check_defaults

    def lib(s: dict) -> dict:
        return {k: values[k][v] if k in values else v for k, v in s.items()}

    def check(s: dict):
        if inner_check:
            inner_check(lib(s))

    return replace(oracle, run=lambda bars, s: inner_run(bars, lib(s)), check_defaults=check)


def by_setting(name: str, oracles: dict, cases: list, note: str = "") -> Oracle:
    """One oracle whose library call is chosen per case by the spec setting `name`."""
    first = oracles[cases[0][name]]

    def run(bars, s):
        return oracles[s[name]].run(bars, s)

    return Oracle(first.library, run, cases, first.check_defaults, note)


def mapped(oracle: Oracle, fn, note: str) -> Oracle:
    """The same oracle with every output passed through `fn` (an array to an array)."""
    inner_run = oracle.run

    def run(bars, s):
        entry, call, inputs, outputs = inner_run(bars, s)
        return entry, call, inputs, {k: fn(np.asarray(v, dtype=np.float64)) for k, v in outputs.items()}

    return replace(oracle, run=run, note=note)


# AlphaTrend reads RSI when the library is given no volume, MFI when it is.
_ALPHA_PARAMS = {"period": "length", "multiplier": "multiplier", "threshold": "threshold", "lag": "lag"}
_ALPHA_OUT = {"value": 0, "signal": 1}

# Decay: pandas-ta-classic's decay (linear or exp) and edecay are one study with a Mode.
_DECAY_PARAMS = {"period": "length", "mode": "mode"}

ORACLES = {
    "adxr": talib_oracle(
        "ADXR",
        cases=[
            {"period": 14},
            {"period": 5},
            {"period": 40},
        ],
    ),
    # pandas-ta 0.4.71b0: length 14, multiplier 1, threshold 50, lag 2, src close, mamode sma
    # (set in the body); talib=False is passed, so its own Python runs.
    "alphatrend": by_setting(
        "momentum",
        {
            "rsi": pta_oracle("alphatrend", inputs=("open_", "high", "low", "close"), params=_ALPHA_PARAMS, outputs=_ALPHA_OUT, cases=[{}, {}, {}]),
            "mfi": pta_oracle("alphatrend", inputs=("open_", "high", "low", "close", "volume"), params=_ALPHA_PARAMS, outputs=_ALPHA_OUT, cases=[{}, {}, {}]),
        },
        cases=[
            {"period": 14, "multiplier": 1, "threshold": 50, "lag": 2, "momentum": "rsi"},
            {"period": 7, "multiplier": 2.5, "threshold": 55, "lag": 3, "momentum": "rsi"},
            {"period": 20, "multiplier": 1, "threshold": 50, "lag": 1, "momentum": "mfi"},
        ],
        note="The momentum setting picks the library's call: no volume (RSI of the close), or the volume passed (MFI).",
    ),
    # fast 8, slow 21, lookback 2, mamode ema (set in the body).
    "amat": ptac_oracle(
        "amat",
        params={"fast": "fast", "slow": "slow", "lookback": "lookback"},
        outputs={"long_run": 0, "short_run": 1},
        cases=[
            {"fast": 8, "slow": 21, "lookback": 2},
            {"fast": 3, "slow": 10, "lookback": 1},
            {"fast": 20, "slow": 50, "lookback": 5},
        ],
    ),
    # p 10; x 3 and q 20 (with tvmode unset the body picks the book's x and q
    # BEFORE it defaults tvmode to True, which then picks Wilder's ATR).
    "cksp": translated(
        ptac_oracle(
            "cksp",
            inputs=("high", "low", "close"),
            params={"period": "p", "multiplier": "x", "stop_period": "q", "smoothing": "tvmode"},
            outputs={"long_stop": 0, "short_stop": 1},
            cases=[{}, {}, {}],
        ),
        {"smoothing": {"wilder": True, "simple": False}},
    ),
    # length 14, atr_length 1 (set in the body); ln and scalar left at log10 and 100.
    "chop": ptac_oracle(
        "chop",
        inputs=("high", "low", "close"),
        params={"period": "length", "atr_period": "atr_length"},
        cases=[
            {"period": 14, "atr_period": 1},
            {"period": 7, "atr_period": 1},
            {"period": 30, "atr_period": 14},
        ],
    ),
    # length 5, mode linear (set in the body); edecay length 5.
    "decay": by_setting(
        "mode",
        {
            "linear": ptac_oracle("decay", params=_DECAY_PARAMS, cases=[{}, {}, {}]),
            "exp": ptac_oracle("decay", params=_DECAY_PARAMS, cases=[{}, {}, {}]),
            "multiplicative": ptac_oracle("edecay", params={"period": "length"}, cases=[{}, {}, {}]),
        },
        cases=[
            {"period": 5, "mode": "linear", "source": "close"},
            {"period": 1, "mode": "exp", "source": "close"},
            {"period": 20, "mode": "multiplicative", "source": "close"},
            {"period": 3, "mode": "linear", "source": "hl2"},
        ],
        note="The mode setting picks the library's call: decay(mode='linear'), decay(mode='exp') or edecay.",
    ),
    # length 20 (set in the body), centered True (the signature).
    "dpo": translated(
        ptac_oracle(
            "dpo",
            params={"period": "length", "centering": "centered"},
            cases=[{}, {}, {}],
        ),
        {"centering": {"centered": True, "trailing": False}},
    ),
    "ht_trendmode": talib_oracle(
        "HT_TRENDMODE",
        params={},
        cases=[
            {"source": "close"},
            {"source": "hl2"},
            {"source": "ohlc4"},
        ],
    ),
    # length 10, multiplier 3.0, mamode ema (set in the body).
    "pmax": ptac_oracle(
        "pmax",
        inputs=("high", "low", "close"),
        params={"period": "length", "multiplier": "multiplier"},
        cases=[
            {"period": 10, "multiplier": 3},
            {"period": 5, "multiplier": 1.5},
            {"period": 30, "multiplier": 2},
        ],
    ),
    # length 10, ma sma (set in the body).
    "qstick": ptac_oracle(
        "qstick",
        inputs=("open_", "close"),
        cases=[
            {"period": 10},
            {"period": 3},
            {"period": 50},
        ],
    ),
    # pandas-ta 0.4.71b0: length 14, mamode rma (set in the body); talib=False.
    "rwi": pta_oracle(
        "rwi",
        inputs=("high", "low", "close"),
        outputs={"plus": 0, "minus": 1},
        cases=[
            {"period": 14},
            {"period": 5},
            {"period": 50},
        ],
    ),
    # pandas-ta-classic's ttm_trend, length 6 (set in the body). The library
    # writes 1 above the average and -1 below; the study is a state, 1 or 0.
    "trend_bars": mapped(
        ptac_oracle(
            "ttm_trend",
            inputs=("high", "low", "close"),
            outputs={"value": 0},
            cases=[
                {"period": 6},
                {"period": 3},
                {"period": 20},
            ],
        ),
        lambda v: np.where(np.isnan(v), np.nan, (v == 1).astype(np.float64)),
        note="The library's -1 (close at or below the average) is written as 0, the study's state for a down bar.",
    ),
    # length 28 (set in the body).
    "vhf": ptac_oracle(
        "vhf",
        cases=[
            {"period": 28, "source": "close"},
            {"period": 10, "source": "close"},
            {"period": 60, "source": "hl2"},
        ],
    ),
}

ORACLES["cksp"] = replace(
    ORACLES["cksp"],
    cases=[
        {"period": 10, "multiplier": 3, "stop_period": 20, "smoothing": "wilder"},
        {"period": 10, "multiplier": 1, "stop_period": 9, "smoothing": "wilder"},
        {"period": 10, "multiplier": 3, "stop_period": 20, "smoothing": "simple"},
        {"period": 5, "multiplier": 2, "stop_period": 5, "smoothing": "wilder"},
    ],
)
ORACLES["dpo"] = replace(
    ORACLES["dpo"],
    cases=[
        {"period": 20, "centering": "centered", "source": "close"},
        {"period": 20, "centering": "trailing", "source": "close"},
        {"period": 9, "centering": "centered", "source": "hl2"},
        {"period": 50, "centering": "trailing", "source": "close"},
    ],
)
