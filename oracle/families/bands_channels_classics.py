"""TA-Lib oracles for the classic bands (families/_classics.py, OS-R9)."""

from families._classics import classic_oracle

ORACLES = {
    # One multiplier for both bands: TA-Lib's nbdevup and nbdevdn together.
    "bbands": classic_oracle([("BBANDS", {"period": "timeperiod", "std_dev_multiplier": ("nbdevup", "nbdevdn")}, {"matype": 0},
        {"upper_band": "upperband", "middle_band": "middleband", "lower_band": "lowerband"})],
        talib_defaults="timeperiod 5, nbdevup and nbdevdn 2, a simple average", cases=[
        {"period": 20, "std_dev_multiplier": 2.0},
        {"period": 5, "std_dev_multiplier": 1.5},
        {"period": 50, "std_dev_multiplier": 3.0},
    ]),
}
