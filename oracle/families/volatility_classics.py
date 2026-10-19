"""TA-Lib oracles for the classic volatility indicators (families/_classics.py, OS-R9)."""

from families._classics import classic_oracle

ORACLES = {
    "atr": classic_oracle([("ATR", {"period": "timeperiod"}, {}, {"atr": "real"})], talib_defaults="timeperiod 14 (the node's)", compare_only=True, cases=[
        {"period": 14}, {"period": 5}, {"period": 50},
    ]),
}
