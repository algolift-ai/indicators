"""TA-Lib oracles for the classic momentum indicators (families/_classics.py, OS-R9)."""

from families._classics import classic_oracle

_MACD = {"fast_period": "fastperiod", "slow_period": "slowperiod", "signal_period": "signalperiod"}


def _stoch(s):
    # The node's type: Fast is TA-Lib's STOCHF (no slowing), Slow is STOCH with
    # a slowing of 3 whatever k_slow_period says, Full is STOCH with k_slow_period.
    if s["stochastic_type"] == "Fast":
        return [("STOCHF", {"k_period": "fastk_period", "d_period": "fastd_period"}, {"fastd_matype": 0},
                 {"percent_k": "fastk", "percent_d": "fastd"})]
    slowing = {"slowk_period": 3} if s["stochastic_type"] == "Slow" else {}
    params = {"k_period": "fastk_period", "d_period": "slowd_period"}
    if s["stochastic_type"] == "Full":
        params["k_slow_period"] = "slowk_period"
    return [("STOCH", params, {**slowing, "slowk_matype": 0, "slowd_matype": 0}, {"percent_k": "slowk", "percent_d": "slowd"})]


ORACLES = {
    "macd": classic_oracle([("MACD", _MACD, {}, {"macd_line": "macd", "signal_line": "macdsignal", "histogram": "macdhist"})],
        talib_defaults="12, 26 and 9 (the node's)", compare_only=True, cases=[
        {"fast_period": 12, "slow_period": 26, "signal_period": 9},
        {"fast_period": 5, "slow_period": 13, "signal_period": 4},
        {"fast_period": 24, "slow_period": 52, "signal_period": 18},
    ]),
    "rsi": classic_oracle([("RSI", {"period": "timeperiod"}, {}, {"value": "real"})], talib_defaults="timeperiod 14 (the node's)", cases=[
        {"period": 14}, {"period": 5}, {"period": 30},
    ]),
    "stoch": classic_oracle(_stoch, talib_defaults="fastk 5, slowk 3 and slowd 3 on simple averages", compare_only=True, cases=[
        {"stochastic_type": "Slow", "k_period": 14, "k_slow_period": 3, "d_period": 3},
        {"stochastic_type": "Fast", "k_period": 5, "k_slow_period": 3, "d_period": 3},
        {"stochastic_type": "Full", "k_period": 21, "k_slow_period": 5, "d_period": 5},
    ]),
    "willr": classic_oracle([("WILLR", {"period": "timeperiod"}, {}, {"value": "real"})], talib_defaults="timeperiod 14 (the node's)", compare_only=True, cases=[
        {"period": 14}, {"period": 5}, {"period": 50},
    ]),
    # TA-Lib's CCI fixes the constant at 0.015, the node's default, and reads
    # the typical price, the node's default series (hlc3).
    "cci": classic_oracle([("CCI", {"period": "timeperiod"}, {}, {"value": "real"})], talib_defaults="timeperiod 14 (the constant 0.015 fixed)", cases=[
        {"period": 20, "constant": 0.015}, {"period": 5, "constant": 0.015}, {"period": 50, "constant": 0.015},
    ]),
    # The node's PPO is on exponential averages: TA-Lib's matype 1.
    "ppo": classic_oracle([("PPO", {"fast_period": "fastperiod", "slow_period": "slowperiod"}, {"matype": 1}, {"ppo_line": "real"})],
        talib_defaults="12 and 26 on simple averages (matype 0)", cases=[
        {"fast_period": 12, "slow_period": 26, "signal_period": 9},
        {"fast_period": 5, "slow_period": 13, "signal_period": 4},
        {"fast_period": 24, "slow_period": 52, "signal_period": 18},
    ]),
    "cmo": classic_oracle([("CMO", {"period": "timeperiod"}, {}, {"value": "real"})], talib_defaults="timeperiod 14 (the node's)", compare_only=True, cases=[
        {"period": 14}, {"period": 5}, {"period": 30},
    ]),
    "trix": classic_oracle([("TRIX", {"period": "timeperiod"}, {}, {"value": "real"})], talib_defaults="timeperiod 30", cases=[
        {"period": 15, "signal_period": 9}, {"period": 5, "signal_period": 4}, {"period": 30, "signal_period": 9},
    ]),
    "uo": classic_oracle([("ULTOSC", {"short_period": "timeperiod1", "medium_period": "timeperiod2", "long_period": "timeperiod3"}, {}, {"value": "real"})],
        talib_defaults="7, 14 and 28 (the node's)", cases=[
        {"short_period": 7, "medium_period": 14, "long_period": 28},
        {"short_period": 3, "medium_period": 6, "long_period": 12},
        {"short_period": 10, "medium_period": 20, "long_period": 40},
    ]),
}
