"""Oracles for the volume family (catalog/volume).

pandas-ta-classic's signatures default every setting to None and set the real
default in the body; each case 0 below says where it read it. The flat bars
200 to 214 have zero volume and zero range (PORTING.md § 13), so marketfi and
eom divide by zero there (and marketfi again at bar 269, zero volume on a bar
with a range): the library's NaN and infinities are written as null.
"""

import dataclasses

from oraclelib import Oracle, ptac_oracle, pta_oracle


def _translated(oracle: Oracle, translate) -> Oracle:
    """The same oracle, calling the library with `translate(settings)`.

    For a spec setting whose values are not the library's (pvol's `signed` is
    a choice of 'no' or 'yes', the library's a bool). The fixture keeps the
    spec's settings and records the library's call.
    """
    run = oracle.run
    return dataclasses.replace(oracle, run=lambda bars, s: run(bars, translate(dict(s))))


def _pvol_call(s: dict) -> dict:
    s["signed"] = s.get("signed") == "yes"
    return s


# Three identical cases for a study with no settings: the oracle machinery asks
# for three, and there is nothing else to vary.
NO_SETTINGS = [{}, {}, {}]

ORACLES = {
    # aobv: fast 4, slow 12, max_lookback 2, min_lookback 2 and the kwarg
    # run_length 2 are set in the body; mamode stays its default, "ema".
    "aobv": ptac_oracle(
        "aobv",
        inputs=("close", "volume"),
        params={"fast": "fast", "slow": "slow", "max_lookback": "max_lookback", "min_lookback": "min_lookback", "run_length": "run_length"},
        outputs={"value": 0, "min": 1, "max": 2, "fast": 3, "slow": 4, "long_run": 5, "short_run": 6},
        cases=[
            {"fast": 4, "slow": 12, "max_lookback": 2, "min_lookback": 2, "run_length": 2},
            {"fast": 10, "slow": 30, "max_lookback": 5, "min_lookback": 8, "run_length": 3},
            {"fast": 40, "slow": 6, "max_lookback": 20, "min_lookback": 1, "run_length": 1},
        ],
    ),
    # eom: length 14 and divisor 100000000 set in the body; drift stays 1.
    "eom": ptac_oracle(
        "eom",
        inputs=("high", "low", "close", "volume"),
        params={"period": "length", "divisor": "divisor"},
        cases=[
            {"period": 14, "divisor": 100000000},
            {"period": 5, "divisor": 100000000},
            {"period": 50, "divisor": 10000},
        ],
    ),
    # kvo: fast 34, slow 55, signal 13 set in the body; mamode "ema".
    "kvo": ptac_oracle(
        "kvo",
        inputs=("high", "low", "close", "volume"),
        params={"fast": "fast", "slow": "slow", "signal": "signal"},
        outputs={"value": 0, "signal": 1},
        cases=[
            {"fast": 34, "slow": 55, "signal": 13},
            {"fast": 10, "slow": 20, "signal": 5},
            {"fast": 5, "slow": 100, "signal": 30},
        ],
    ),
    "marketfi": ptac_oracle("marketfi", inputs=("high", "low", "volume"), params={}, cases=NO_SETTINGS),
    # nvi / pvi: length 1 and initial 1000 set in the body.
    "nvi": ptac_oracle(
        "nvi",
        inputs=("close", "volume"),
        params={"period": "length", "initial": "initial"},
        cases=[
            {"period": 1, "initial": 1000},
            {"period": 5, "initial": 1000},
            {"period": 20, "initial": 100},
        ],
    ),
    "pvi": ptac_oracle(
        "pvi",
        inputs=("close", "volume"),
        params={"period": "length", "initial": "initial"},
        cases=[
            {"period": 1, "initial": 1000},
            {"period": 5, "initial": 1000},
            {"period": 20, "initial": 100},
        ],
    ),
    # pvo (pandas-ta-classic's momentum/pvo): fast 12, slow 26, signal 9 set in
    # the body; scalar stays 100. The last case has fast above slow, which the
    # library swaps.
    "pvo": ptac_oracle(
        "pvo",
        inputs=("volume",),
        params={"fast": "fast", "slow": "slow", "signal": "signal"},
        outputs={"value": 0, "histogram": 1, "signal": 2},
        cases=[
            {"fast": 12, "slow": 26, "signal": 9},
            {"fast": 5, "slow": 10, "signal": 3},
            {"fast": 100, "slow": 30, "signal": 20},
        ],
    ),
    "pvr": ptac_oracle("pvr", inputs=("close", "volume"), params={}, cases=NO_SETTINGS),
    # pvt: drift stays 1 (not a setting).
    "pvt": ptac_oracle("pvt", inputs=("close", "volume"), params={}, cases=NO_SETTINGS),
    # pvol: the kwarg `signed` defaults to False in the body.
    "pvol": _translated(
        ptac_oracle(
            "pvol",
            inputs=("close", "volume"),
            params={"signed": "signed"},
            cases=[{"signed": "no"}, {"signed": "yes"}, {"signed": "no"}],
        ),
        _pvol_call,
    ),
    # tsv (pandas-ta 0.4.71b0): length 18, signal 10 set in the body; mamode
    # "sma", which pandas-ta computes with TA-Lib's SMA when TA-Lib is installed.
    "tsv": pta_oracle(
        "tsv",
        inputs=("close", "volume"),
        params={"period": "length", "signal": "signal"},
        outputs={"value": 0, "signal": 1, "ratio": 2},
        cases=[
            {"period": 18, "signal": 10},
            {"period": 5, "signal": 3},
            {"period": 50, "signal": 20},
        ],
    ),
    # vosc: fast 14, slow 28 set in the body. The last case has fast above
    # slow, which the library swaps.
    "vosc": ptac_oracle(
        "vosc",
        inputs=("volume",),
        params={"fast": "fast", "slow": "slow"},
        cases=[
            {"fast": 14, "slow": 28},
            {"fast": 3, "slow": 10},
            {"fast": 120, "slow": 50},
        ],
    ),
    "wad": ptac_oracle("wad", inputs=("high", "low", "close"), params={}, cases=NO_SETTINGS),
}
