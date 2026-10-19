"""Oracles for the price transforms family (catalog/price_transforms)."""

from oraclelib import ptac_oracle, talib_oracle

# A price transform reads bar fields, so it has no settings: three equal calls.
NO_SETTINGS = [{}, {}, {}]


def _bar_transform(function: str):
    return talib_oracle(function, params={}, cases=NO_SETTINGS, note=f"{function} has no settings: its three cases are the same call.")


ORACLES = {
    "hl2": _bar_transform("MEDPRICE"),
    "hlc3": _bar_transform("TYPPRICE"),
    "ohlc4": _bar_transform("AVGPRICE"),
    "wcp": _bar_transform("WCLPRICE"),
    # MIDPOINT reads one series (`source`); its period runs from 2.
    "midpoint": talib_oracle(
        "MIDPOINT",
        cases=[
            {"period": 14, "source": "close"},
            {"period": 2, "source": "close"},
            {"period": 100, "source": "close"},
            {"period": 9, "source": "hlc3"},
        ],
    ),
    # MIDPRICE reads high and low.
    "midprice": talib_oracle(
        "MIDPRICE",
        cases=[{"period": 14}, {"period": 2}, {"period": 100}],
    ),
}

# The candle rows (P3's renderer). Both return a DataFrame of open, high, low,
# close, mapped by column position (pandas-ta names the columns after the settings).
OHLC_INPUTS = ("open_", "high", "low", "close")
OHLC_OUTPUTS = {"open": 0, "high": 1, "low": 2, "close": 3}

ORACLES.update(
    {
        # Heikin Ashi has no settings: three equal calls.
        "heikin_ashi": ptac_oracle(
            "ha",
            inputs=OHLC_INPUTS,
            params={},
            outputs=OHLC_OUTPUTS,
            cases=NO_SETTINGS,
            note="ha has no settings: its three cases are the same call.",
        ),
        # Body default: length 30 (full False; the ddof it passes is swallowed by zscore's **kwargs).
        "cdl_z": ptac_oracle(
            "cdl_z",
            inputs=OHLC_INPUTS,
            outputs=OHLC_OUTPUTS,
            cases=[{"period": 30}, {"period": 2}, {"period": 10}, {"period": 100}],
        ),
    }
)
