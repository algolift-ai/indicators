"""Oracles for the cycles family (catalog/cycles)."""

import numpy as np

from oraclelib import Oracle, ptac_oracle, source, talib_oracle

# TA-Lib's Hilbert transforms take no settings: the cases vary the source.
_HT_CASES = [{"source": "close"}, {"source": "hl2"}, {"source": "ohlc4"}]

# pandas-ta 0.4.71b0's Reflex and Trendflex: default length 20, smooth 20,
# alpha 0.04 (body); Ehlers' truncated pi 3.14159 and sqrt(2) 1.414 stay fixed.
_FLEX_CASES = [
    {"period": 20, "smooth": 20, "alpha": 0.04, "source": "close"},
    {"period": 8, "smooth": 10, "alpha": 0.1, "source": "hl2"},
    {"period": 60, "smooth": 30, "alpha": 0.02, "source": "close"},
]



# ---------------------------------------------------------------- Ehlers' degrees
#
# Ehlers writes his filters in TradeStation's EasyLanguage, whose Sine and
# Cosine take DEGREES ("the trigonometric arguments are in degrees whereas
# they are in radians in most other languages": Ehlers, "Predictive and
# Successful Indicators", TASC January 2014). pandas-ta-classic's ebsw() and
# pandas-ta's reflex() and trendflex() pass his angles to numpy's sin and cos
# as radians: cos(360 / length) where Ehlers means cos(360 deg / length). The
# specs follow Ehlers (ruling 2026-10-13, as for VIDYA and KST), so each oracle
# below is the library's own body, step for step, with that one correction:
# every angle Ehlers writes in degrees goes through np.deg2rad first.


def _ebsw_degrees_oracle() -> Oracle:
    """EBSW as pandas-ta-classic 0.8.32's _ebsw_nb computes it, with Ehlers' angles in degrees."""

    def run(bars, s):
        src = s.get("source", "close")
        # ebsw()'s validation: a length of 38 or less reads as 40; bars below 1 as 10.
        length = int(s["period"]) if s["period"] and s["period"] > 38 else 40
        bars_ = int(s["smooth"]) if s["smooth"] and s["smooth"] > 0 else 10
        close = np.asarray(source(bars, src), dtype=np.float64)
        m = close.size
        result = np.full(m, np.nan)
        if length - 1 < m:
            result[length - 1] = 0.0
        alpha1 = (1 - np.sin(np.deg2rad(360 / length))) / np.cos(np.deg2rad(360 / length))
        a1 = np.exp(-np.sqrt(2) * np.pi / bars_)
        b1 = 2 * a1 * np.cos(np.deg2rad(np.sqrt(2) * 180 / bars_))
        c2 = b1
        c3 = -1 * a1 * a1
        c1 = 1 - c2 - c3
        last_close = last_hp = fh0 = fh1 = 0.0
        for i in range(length, m):
            hp = 0.5 * (1 + alpha1) * (close[i] - last_close) + alpha1 * last_hp
            filt = c1 * (hp + last_hp) / 2 + c2 * fh1 + c3 * fh0
            wave = (filt + fh1 + fh0) / 3
            pwr = (filt * filt + fh1 * fh1 + fh0 * fh0) / 3
            result[i] = wave / np.sqrt(pwr) if pwr > 0 else 0.0
            fh0, fh1, last_hp, last_close = fh1, filt, hp, close[i]
        return "ebsw (Ehlers' angles in degrees)", {"length": length, "bars": bars_}, [src], {"value": result}

    def check(s):
        # ebsw()'s body: length 40, bars 10, close.
        if (s["period"], s["smooth"], s.get("source", "close")) != (40, 10, "close"):
            raise ValueError("ebsw: cases[0] must be the library's defaults (40, 10, close)")

    return Oracle(
        "pandas-ta-classic",
        run,
        [
            {"period": 40, "smooth": 10, "source": "close"},
            {"period": 39, "smooth": 4, "source": "hl2"},
            {"period": 120, "smooth": 30, "source": "close"},
        ],
        check,
        note="pandas-ta-classic's _ebsw_nb body with one correction: Ehlers' angles (360 / length and sqrt(2) x 180 / bars) are degrees, as in his EasyLanguage, where the library takes them as radians; see families/cycles.py.",
    )


def _flex_degrees_oracle(name: str) -> Oracle:
    """Reflex or Trendflex as pandas-ta 0.4.71b0's np_reflex / nb_trendflex
    compute them, with the Super Smoother's cosine angle (180 x ratio) in degrees."""

    def run(bars, s):
        src = s.get("source", "close")
        n, k, alpha = int(s["period"]), int(s["smooth"]), float(s["alpha"])
        pi, sqrt2 = 3.14159, 1.414  # the library's defaults, Ehlers' truncated values
        x = np.asarray(source(bars, src), dtype=np.float64)
        m, ratio = x.size, 2 * sqrt2 / k
        a = np.exp(-pi * ratio)
        b = 2 * a * np.cos(np.deg2rad(180 * ratio))
        c = a * a - b + 1
        f = np.zeros_like(x)
        ms = np.zeros_like(x)
        result = np.zeros_like(x)
        for i in range(2, m):
            f[i] = 0.5 * c * (x[i] + x[i - 1]) + b * f[i - 1] - a * a * f[i - 2]
        for i in range(n, m):
            total = 0.0
            if name == "reflex":
                slope = (f[i - n] - f[i]) / n
                for j in range(1, n):
                    total += f[i] - f[i - j] + j * slope
            else:
                for j in range(1, n):
                    total += f[i] - f[i - j]
            total /= n
            ms[i] = alpha * total * total + (1 - alpha) * ms[i - 1]
            if ms[i] != 0.0:
                result[i] = total / np.sqrt(ms[i])
        result[:n] = np.nan
        return f"{name} (Ehlers' angle in degrees)", {"length": n, "smooth": k, "alpha": alpha}, [src], {"value": result}

    def check(s):
        # The body's defaults: length 20, smooth 20, alpha 0.04, close.
        if (s["period"], s["smooth"], s["alpha"], s.get("source", "close")) != (20, 20, 0.04, "close"):
            raise ValueError(f"{name}: cases[0] must be the library's defaults (20, 20, 0.04, close)")

    return Oracle(
        "pandas-ta",
        run,
        _FLEX_CASES,
        check,
        note=f"pandas-ta's {name} body with one correction: the Super Smoother's cosine angle, 180 x 2 x 1.414 / smooth, is in degrees, as in Ehlers' EasyLanguage, where the library takes it as radians; see families/cycles.py.",
    )


ORACLES = {
    # Default length 10 (body).
    "cg": ptac_oracle(
        "cg",
        cases=[
            {"period": 10, "source": "close"},
            {"period": 4, "source": "hlc3"},
            {"period": 60, "source": "close"},
        ],
    ),
    # Default length 14 (body); its EMA runs pandas-ta-classic's own (SMA seed).
    "dsp": ptac_oracle(
        "dsp",
        cases=[
            {"period": 14, "source": "close"},
            {"period": 5, "source": "hl2"},
            {"period": 100, "source": "close"},
        ],
    ),
    # Default length 40 (body; anything 38 or below reads as 40) and bars 10;
    # the library's body with Ehlers' degrees (above).
    "ebsw": _ebsw_degrees_oracle(),
    "ht_dcperiod": talib_oracle("HT_DCPERIOD", params={}, cases=_HT_CASES),
    "ht_dcphase": talib_oracle("HT_DCPHASE", params={}, cases=_HT_CASES),
    "ht_phasor": talib_oracle(
        "HT_PHASOR",
        params={},
        outputs={"in_phase": "inphase", "quadrature": "quadrature"},
        cases=_HT_CASES,
    ),
    "ht_sine": talib_oracle(
        "HT_SINE",
        params={},
        outputs={"value": "sine", "lead": "leadsine"},
        cases=_HT_CASES,
    ),
    # Default period 5 (body). tulipy=False runs the library's own numpy path
    # (tulipy, LGPL, is not installed either); the spec is written from Ehlers'
    # formula, and this is its oracle.
    "reflex": _flex_degrees_oracle("reflex"),
    "trendflex": _flex_degrees_oracle("trendflex"),
}
