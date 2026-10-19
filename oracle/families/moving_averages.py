"""Oracles for the moving_averages family (catalog/moving_averages)."""

import numpy as np

from oraclelib import Oracle, ptac_oracle, pta_oracle, source, talib_oracle


def _vidya_oracle() -> Oracle:
    """VIDYA as pandas-ta-classic 0.8.32's vidya() computes it, with one correction.

    The library's CMO divides the window's up-move sum minus its down-move sum
    by their total. A window with no price change at all makes that 0 / 0 =
    NaN, and the NaN then carries through the recursion, so every later value
    is NaN (on the fixture bars, from bar 213 to the end at period 14). Here,
    as in the spec, such a window's CMO is 0, so VIDYA holds its value through
    the flat stretch. Everything else is the library's body: the inlined CMO
    (diff(1), clip, rolling sums), the SMA seed on bar length - 1, alpha =
    2 / (length + 1), and the same recursion in the same order.
    """
    import pandas as pd  # noqa: PLC0415

    def run(bars, s):
        src = s.get("source", "close")
        length = s["period"]
        close = pd.Series(source(bars, src))
        mom = close.diff(1)
        pos_sum = mom.copy().clip(lower=0).rolling(length).sum()
        neg_sum = mom.copy().clip(upper=0).abs().rolling(length).sum()
        den = pos_sum + neg_sum
        cmo = (pos_sum - neg_sum) / den
        cmo[den == 0] = 0.0  # the correction: no change in the window reads as a CMO of 0
        abs_cmo = cmo.abs().to_numpy()
        c_arr = close.to_numpy()
        m = close.size
        alpha = 2 / (length + 1)
        out = np.full(m, np.nan)
        out[length - 1] = close.iloc[:length].mean()
        for i in range(length, m):
            out[i] = alpha * abs_cmo[i] * c_arr[i] + out[i - 1] * (1 - alpha * abs_cmo[i])
        return "vidya (a flat window's CMO read as 0)", {"length": length, "drift": 1}, [src], {"value": out}

    def check(s):
        # vidya()'s body: length 14, drift 1, close.
        if (s["period"], s.get("source", "close")) != (14, "close"):
            raise ValueError("vidya: cases[0] must be the library's defaults (14, close)")

    return Oracle(
        "pandas-ta-classic",
        run,
        [
            {"period": 14, "source": "close"},
            {"period": 5, "source": "hl2"},
            {"period": 40, "source": "close"},
        ],
        check,
        note="pandas-ta-classic's vidya() body with one correction: a window with no price change has a CMO of 0 (the library's 0 / 0 NaN would blank every later value); see families/moving_averages.py.",
    )


ORACLES = {
    "wma": talib_oracle(
        "WMA",
        cases=[
            {"period": 30, "source": "close"},
            {"period": 9, "source": "hlc3"},
            {"period": 100, "source": "close"},
        ],
    ),
    "trima": talib_oracle(
        "TRIMA",
        cases=[
            {"period": 30, "source": "close"},
            {"period": 4, "source": "close"},
            {"period": 15, "source": "ohlc4"},
        ],
    ),
    # pandas-ta 0.4.71b0: jaw 13, teeth 8, lips 5 (set in the body). Unshifted:
    # the library leaves the forward shift to the caller, and so does the spec.
    "alligator": pta_oracle(
        "alligator",
        params={"jaw_period": "jaw", "teeth_period": "teeth", "lips_period": "lips"},
        outputs={"jaw": 0, "teeth": 1, "lips": 2},
        cases=[
            {"jaw_period": 13, "teeth_period": 8, "lips_period": 5, "source": "close"},
            {"jaw_period": 21, "teeth_period": 13, "lips_period": 8, "source": "hl2"},
            {"jaw_period": 89, "teeth_period": 34, "lips_period": 2, "source": "close"},
        ],
    ),
    # pandas-ta 0.4.71b0, not the classic fork: pandas-ta-classic 0.8.32 applies
    # the Gaussian weights reversed (the heaviest on the oldest bar). Defaults
    # in the body: length 9, sigma 6.0, dist_offset 0.85.
    "alma": pta_oracle(
        "alma",
        params={"period": "length", "sigma": "sigma", "distribution_offset": "dist_offset"},
        cases=[
            {"period": 9, "sigma": 6.0, "distribution_offset": 0.85, "source": "close"},
            {"period": 21, "sigma": 3.0, "distribution_offset": 0.5, "source": "hlc3"},
            {"period": 100, "sigma": 10.0, "distribution_offset": 0.99, "source": "close"},
            {"period": 4, "sigma": 6.0, "distribution_offset": 0.0, "source": "close"},
        ],
        note="Oracle is pandas-ta 0.4.71b0: pandas-ta-classic 0.8.32 reverses ALMA's weights, so its line leans on the oldest bars.",
    ),
    # Default length 10 (body).
    "fwma": ptac_oracle(
        "fwma",
        cases=[
            {"period": 10, "source": "close"},
            {"period": 3, "source": "hl2"},
            {"period": 60, "source": "close"},
        ],
    ),
    # Defaults high_length 13, low_length 21, mamode sma (body).
    "hilo": ptac_oracle(
        "hilo",
        inputs=("high", "low", "close"),
        params={"high_period": "high_length", "low_period": "low_length"},
        outputs={"value": 0},
        cases=[
            {"high_period": 13, "low_period": 21},
            {"high_period": 5, "low_period": 5},
            {"high_period": 50, "low_period": 30},
        ],
    ),
    "ht_trendline": talib_oracle(
        "HT_TRENDLINE",
        params={},
        cases=[
            {"source": "close"},
            {"source": "hl2"},
            {"source": "ohlc4"},
        ],
    ),
    # Defaults na 0.2, nb 0.1, nc 0.1 (body).
    "hwma": ptac_oracle(
        "hwma",
        params={"alpha": "na", "beta": "nb", "gamma": "nc"},
        cases=[
            {"alpha": 0.2, "beta": 0.1, "gamma": 0.1, "source": "close"},
            {"alpha": 0.5, "beta": 0.3, "gamma": 0.05, "source": "hlc3"},
            {"alpha": 0.05, "beta": 0.02, "gamma": 0.01, "source": "close"},
        ],
    ),
    # Defaults length 10, c 1 (body).
    "mcgd": ptac_oracle(
        "mcgd",
        params={"period": "length", "constant": "c"},
        cases=[
            {"period": 10, "constant": 1, "source": "close"},
            {"period": 3, "constant": 0.6, "source": "hl2"},
            {"period": 50, "constant": 1, "source": "close"},
        ],
    ),
    "mama": talib_oracle(
        "MAMA",
        params={"fast_limit": "fastlimit", "slow_limit": "slowlimit"},
        outputs={"value": "mama", "signal": "fama"},
        cases=[
            {"fast_limit": 0.5, "slow_limit": 0.05, "source": "close"},
            {"fast_limit": 0.3, "slow_limit": 0.02, "source": "hl2"},
            {"fast_limit": 0.9, "slow_limit": 0.1, "source": "close"},
        ],
    ),
    # Defaults length 10, step 5 (kwargs), six ribbons (kwargs, not a setting).
    "mmar": ptac_oracle(
        "mmar",
        params={"period": "length", "step": "step"},
        outputs={f"ma_{i + 1}": i for i in range(6)},
        cases=[
            {"period": 10, "step": 5, "source": "close"},
            {"period": 5, "step": 2, "source": "hlc3"},
            {"period": 20, "step": 10, "source": "close"},
        ],
    ),
    # Default length 10 (body).
    "pwma": ptac_oracle(
        "pwma",
        cases=[
            {"period": 10, "source": "close"},
            {"period": 3, "source": "ohlc4"},
            {"period": 40, "source": "close"},
        ],
    ),
    # Defaults length 2, ten ribbons (kwargs, not a setting).
    "rainbow": ptac_oracle(
        "rainbow",
        outputs={f"ma_{i + 1}": i for i in range(10)},
        cases=[
            {"period": 2, "source": "close"},
            {"period": 5, "source": "hl2"},
            {"period": 10, "source": "close"},
        ],
    ),
    # Default length 14 (body).
    "sinwma": ptac_oracle(
        "sinwma",
        cases=[
            {"period": 14, "source": "close"},
            {"period": 4, "source": "hl2"},
            {"period": 100, "source": "close"},
        ],
    ),
    # Default length 10 (body); two poles (ssf3 is its own row).
    "ssf": ptac_oracle(
        "ssf",
        fixed={"poles": 2},
        cases=[
            {"period": 10, "source": "close"},
            {"period": 4, "source": "hl2"},
            {"period": 60, "source": "close"},
        ],
    ),
    # pandas-ta 0.4.71b0: default length 20, Ehlers' truncated pi 3.14159 and
    # sqrt(3) 1.732 (body; not settings).
    "ssf3": pta_oracle(
        "ssf3",
        cases=[
            {"period": 20, "source": "close"},
            {"period": 6, "source": "hl2"},
            {"period": 80, "source": "close"},
        ],
    ),
    # Default length 10 (body).
    "swma": ptac_oracle(
        "swma",
        cases=[
            {"period": 10, "source": "close"},
            {"period": 5, "source": "hlc3"},
            {"period": 50, "source": "close"},
        ],
    ),
    "t3": talib_oracle(
        "T3",
        params={"period": "timeperiod", "volume_factor": "vfactor"},
        cases=[
            {"period": 5, "volume_factor": 0.7, "source": "close"},
            {"period": 3, "volume_factor": 0.0, "source": "hl2"},
            {"period": 20, "volume_factor": 1.0, "source": "close"},
            {"period": 1, "volume_factor": 0.7, "source": "close"},
        ],
    ),
    "vidya": _vidya_oracle(),
    # Default length 10 (body).
    "vwma": ptac_oracle(
        "vwma",
        inputs=("close", "volume"),
        cases=[
            {"period": 10, "source": "close"},
            {"period": 3, "source": "hlc3"},
            {"period": 50, "source": "close"},
        ],
    ),
    # Default length 10 (body).
    "rma": ptac_oracle(
        "rma",
        cases=[
            {"period": 10, "source": "close"},
            {"period": 3, "source": "hl2"},
            {"period": 100, "source": "close"},
        ],
    ),
    # Default length 10, mamode ema (body).
    "zlma": ptac_oracle(
        "zlma",
        cases=[
            {"period": 10, "source": "close"},
            {"period": 2, "source": "hl2"},
            {"period": 50, "source": "close"},
        ],
    ),
}
