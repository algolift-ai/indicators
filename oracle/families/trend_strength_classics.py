"""TA-Lib oracles for the classic trend-strength indicators (families/_classics.py, OS-R9)."""

from families._classics import classic_oracle

_P = {"period": "timeperiod"}

ORACLES = {
    # The node's smoothing_method and adxr_lookback stay at their defaults:
    # TA-Lib's ADX is Wilder's, and ADXR is its own function.
    "adx": classic_oracle([
        ("PLUS_DI", _P, {}, {"plus_di": "real"}),
        ("MINUS_DI", _P, {}, {"minus_di": "real"}),
        ("DX", _P, {}, {"dx": "real"}),
        ("ADX", _P, {}, {"adx": "real"}),
    ], talib_defaults="timeperiod 14 (the node's)", compare_only=True, cases=[
        {"period": 14, "smoothing_method": "Wilder", "adxr_lookback": 0},
        {"period": 5, "smoothing_method": "Wilder", "adxr_lookback": 0},
        {"period": 30, "smoothing_method": "Wilder", "adxr_lookback": 0},
    ]),
    "aroon": classic_oracle([
        ("AROON", _P, {}, {"aroon_down": "aroondown", "aroon_up": "aroonup"}),
        ("AROONOSC", _P, {}, {"oscillator": "real"}),
    ], talib_defaults="timeperiod 14 (the node's)", compare_only=True, cases=[
        {"period": 14}, {"period": 5}, {"period": 50},
    ]),
    # TA-Lib's SAR starts the acceleration at its step: every case keeps
    # start equal to increment.
    "psar": classic_oracle([("SAR", {"start": "acceleration", "max_value": "maximum"}, {}, {"value": "real"})],
        talib_defaults="acceleration 0.02 and maximum 0.2 (the node's)", compare_only=True, cases=[
        {"start": 0.02, "increment": 0.02, "max_value": 0.2},
        {"start": 0.01, "increment": 0.01, "max_value": 0.1},
        {"start": 0.05, "increment": 0.05, "max_value": 0.5},
    ]),
}
