"""Oracles for the volatility family (catalog/volatility)."""

import numpy as np

from oraclelib import Oracle, pta_oracle, ptac_oracle, talib_oracle

HLC = ("high", "low", "close")


def _by_setting(setting: str, oracles: dict, note: str = "") -> Oracle:
    """One oracle per value of a spec setting (a mode folding library functions or flags).

    Each case runs the oracle its `setting` names; case 0's defaults are
    checked by the oracle of the default value.
    """
    first = next(iter(oracles.values()))

    def run(bars, s):
        return oracles[s[setting]].run(bars, s)

    def check(s):
        oracles[s[setting]].check_defaults(s)

    cases = first.cases
    return Oracle(first.library, run, cases, check, note)


def _scaled(oracle: Oracle, factor: float) -> Oracle:
    """The same oracle with every output multiplied by `factor` (a fraction put in percent)."""

    def run(bars, s):
        entry, call, inputs, outputs = oracle.run(bars, s)
        return entry, call, inputs, {k: v * factor for k, v in outputs.items()}

    return Oracle(oracle.library, run, oracle.cases, oracle.check_defaults, oracle.note)


def _zero_floor(oracle: Oracle, floor: float, note: str) -> Oracle:
    """The same oracle with every output under `floor` in size written as 0.

    A standard deviation over a window with no movement is 0, but the library's
    rolling variance leaves a rounding residue there (about 1e-18) that the square
    root lifts to about 1e-7, and its last bits depend on the processor: a fixture
    holding the residue is not the same on every machine. Under `floor` the value
    is that residue, never a volatility, so the fixture records the exact 0.
    """

    def run(bars, s):
        entry, call, inputs, outputs = oracle.run(bars, s)
        return entry, call, inputs, {k: np.where(np.abs(v) < floor, 0.0, v) for k, v in outputs.items()}

    return Oracle(oracle.library, run, oracle.cases, oracle.check_defaults, note)


_HVOL_CASES = [
    # length 20 and annualization 252 are set in hvol's body (the signature says None).
    {"period": 20, "annualization": 252, "estimator": "sample", "source": "close"},
    {"period": 10, "annualization": 52, "estimator": "sample", "source": "hlc3"},
    {"period": 60, "annualization": 252, "estimator": "population", "source": "close"},
    {"period": 5, "annualization": 252, "estimator": "population", "source": "close"},
]

_RVI_CASES = [
    # length 14 is set in rvi's body; the standard mode is refined=False, thirds=False.
    {"period": 14, "method": "standard", "source": "close"},
    {"period": 10, "method": "standard", "source": "hl2"},
    {"period": 7, "method": "refined", "source": "close"},
    {"period": 30, "method": "thirds", "source": "close"},
]


def _rvi(**fixed):
    return ptac_oracle("rvi", inputs=("close", "high", "low"), fixed=fixed or None, cases=_RVI_CASES)


ORACLES = {
    "natr": talib_oracle(
        "NATR",
        cases=[
            {"period": 14},
            {"period": 5},
            {"period": 50},
        ],
    ),
    "aberration": ptac_oracle(
        "aberration",
        inputs=HLC,
        params={"period": "length", "atr_period": "atr_length"},
        outputs={"middle": 0, "upper": 1, "lower": 2, "atr": 3},
        cases=[
            # length 5 and atr_length 15 are set in the body.
            {"period": 5, "atr_period": 15},
            {"period": 20, "atr_period": 10},
            {"period": 2, "atr_period": 50},
        ],
    ),
    "accbands": ptac_oracle(
        "accbands",
        inputs=HLC,
        params={"period": "length", "multiplier": "c"},
        outputs={"lower": 0, "middle": 1, "upper": 2},
        cases=[
            # length 20 and c 4 are set in the body (mamode sma).
            {"period": 20, "multiplier": 4},
            {"period": 10, "multiplier": 2},
            {"period": 100, "multiplier": 6.5},
        ],
    ),
    "atr_stop": pta_oracle(
        "atrts",
        inputs=HLC,
        params={"period": "length", "ma_period": "ma_length", "multiplier": "k"},
        cases=[
            # length 14, ma_length 20 and k 3 are set in the body (mamode ema).
            {"period": 14, "ma_period": 20, "multiplier": 3},
            {"period": 5, "ma_period": 50, "multiplier": 2},
            {"period": 30, "ma_period": 10, "multiplier": 1.5},
        ],
    ),
    "chandelier": ptac_oracle(
        "ce",
        inputs=HLC,
        params={"period": "length", "multiplier": "multiplier"},
        outputs={"long": 0, "short": 1},
        cases=[
            # length 22 and multiplier 3 are set in the body (the ATR's rma).
            {"period": 22, "multiplier": 3},
            {"period": 10, "multiplier": 2},
            {"period": 50, "multiplier": 4.5},
        ],
    ),
    "thermo": ptac_oracle(
        "thermo",
        inputs=("high", "low"),
        params={"period": "length", "long_factor": "long", "short_factor": "short"},
        outputs={"value": 0, "signal": 1, "long": 2, "short": 3},
        cases=[
            # length 20, long 2 and short 0.5 are set in the body (mamode ema).
            {"period": 20, "long_factor": 2, "short_factor": 0.5},
            {"period": 10, "long_factor": 1.5, "short_factor": 0.8},
            {"period": 60, "long_factor": 3, "short_factor": 0.25},
        ],
    ),
    "hvol": _zero_floor(_by_setting(
        "estimator",
        {
            "sample": ptac_oracle(
                "hvol",
                params={"period": "length", "annualization": "annualization"},
                cases=_HVOL_CASES,
            ),
            # avolume is the population form, in a fraction and always on 252
            # bars a year: the cases that use it keep annualization at 252, and
            # its fraction is put in percent like hvol's.
            "population": _scaled(ptac_oracle("avolume", params={"period": "length"}, cases=_HVOL_CASES), 100.0),
        },
        note="estimator 'sample' is hvol; 'population' is avolume (tulipy's VOLATILITY) times 100, so both read in percent.",
    ), 1e-4, "estimator 'sample' is hvol; 'population' is avolume (tulipy's VOLATILITY) times 100, so both read in percent. A window with no movement reads 0: the library's rounding residue there (under 1e-4) is written as the exact 0."),
    "hwc": ptac_oracle(
        "hwc",
        params={"alpha": "na", "beta": "nb", "gamma": "nc", "delta": "nd", "multiplier": "scalar"},
        outputs={"middle": 0, "upper": 1, "lower": 2},
        cases=[
            # na 0.2, nb 0.1, nc 0.1, nd 0.1 and scalar 1 are set in the body.
            {"alpha": 0.2, "beta": 0.1, "gamma": 0.1, "delta": 0.1, "multiplier": 1, "source": "close"},
            {"alpha": 0.5, "beta": 0.3, "gamma": 0.05, "delta": 0.3, "multiplier": 2, "source": "hlc3"},
            {"alpha": 0.05, "beta": 0.02, "gamma": 0.2, "delta": 0.05, "multiplier": 1.5, "source": "close"},
        ],
    ),
    "massi": ptac_oracle(
        "massi",
        inputs=("high", "low"),
        params={"fast": "fast", "slow": "slow"},
        cases=[
            # fast 9 and slow 25 are set in the body.
            {"fast": 9, "slow": 25},
            {"fast": 5, "slow": 10},
            {"fast": 20, "slow": 60},
        ],
    ),
    "pdist": ptac_oracle(
        "pdist",
        inputs=("open_", "high", "low", "close"),
        params={},
        cases=[{}, {}, {}],
        note="Price Distance has no settings: its three cases are the same call.",
    ),
    "rvi": _by_setting(
        "method",
        {
            "standard": _rvi(),
            "refined": _rvi(refined=True),
            "thirds": _rvi(thirds=True),
        },
    ),
    "true_range": talib_oracle(
        "TRANGE",
        params={},
        cases=[{}, {}, {}],
        note="True Range has no settings: its three cases are the same call.",
    ),
    "ui": ptac_oracle(
        "ui",
        cases=[
            # length 14 is set in the body (scalar 100).
            {"period": 14, "source": "close"},
            {"period": 5, "source": "hlc3"},
            {"period": 100, "source": "close"},
        ],
    ),
}
