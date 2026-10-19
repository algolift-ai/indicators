"""TA-Lib oracles for the classic volume indicators (families/_classics.py, OS-R9)."""

from families._classics import classic_oracle

ORACLES = {
    # TA-Lib's AD and OBV take no settings; the node's smoothing_period changes
    # only its smoothed_value output, which TA-Lib does not compute.
    "ad": classic_oracle([("AD", {}, {}, {"value": "real"})], talib_defaults="none (AD takes no settings)", cases=[
        {"smoothing_period": 10}, {"smoothing_period": 5}, {"smoothing_period": 20},
    ]),
    "adosc": classic_oracle([("ADOSC", {"fast_period": "fastperiod", "slow_period": "slowperiod"}, {}, {"value": "real"})],
        talib_defaults="fastperiod 3 and slowperiod 10 (the node's)", compare_only=True, cases=[
        {"fast_period": 3, "slow_period": 10}, {"fast_period": 2, "slow_period": 5}, {"fast_period": 5, "slow_period": 20},
    ]),
    "mfi": classic_oracle([("MFI", {"period": "timeperiod"}, {}, {"value": "real"})], talib_defaults="timeperiod 14 (the node's)", compare_only=True, cases=[
        {"period": 14}, {"period": 5}, {"period": 30},
    ]),
    "obv": classic_oracle([("OBV", {}, {}, {"value": "real"})], talib_defaults="none (OBV takes no settings)", compare_only=True, cases=[
        {"smoothing_period": 10}, {"smoothing_period": 5}, {"smoothing_period": 20},
    ]),
}
