"""TA-Lib oracles for the classic moving averages (families/_classics.py, OS-R9)."""

from families._classics import classic_oracle

ORACLES = {
    "sma": classic_oracle([("SMA", {"period": "timeperiod"}, {}, {"value": "real"})], talib_defaults="timeperiod 30", cases=[
        {"period": 20}, {"period": 5}, {"period": 100},
    ]),
    "ema": classic_oracle([("EMA", {"period": "timeperiod"}, {}, {"value": "real"})], talib_defaults="timeperiod 30", cases=[
        {"period": 20}, {"period": 9}, {"period": 100},
    ]),
    "dema": classic_oracle([("DEMA", {"period": "timeperiod"}, {}, {"value": "real"})], talib_defaults="timeperiod 30", cases=[
        {"period": 14}, {"period": 5}, {"period": 50},
    ]),
    "tema": classic_oracle([("TEMA", {"period": "timeperiod"}, {}, {"value": "real"})], talib_defaults="timeperiod 30", cases=[
        {"period": 14}, {"period": 5}, {"period": 40},
    ]),
    # TA-Lib's KAMA fixes the fast and slow constants at 2 and 30, the node's
    # defaults, so every case keeps them.
    "kama": classic_oracle([("KAMA", {"period": "timeperiod"}, {}, {"value": "real"})], talib_defaults="timeperiod 30 (fast 2 and slow 30 fixed)", compare_only=True, cases=[
        {"period": 10, "fast_period": 2, "slow_period": 30},
        {"period": 5, "fast_period": 2, "slow_period": 30},
        {"period": 30, "fast_period": 2, "slow_period": 30},
    ]),
}
