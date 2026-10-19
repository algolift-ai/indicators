"""TA-Lib oracles for the classic linear regression (families/_classics.py, OS-R9)."""

from families._classics import classic_oracle

_P = {"period": "timeperiod"}

ORACLES = {
    "linreg": classic_oracle([
        ("LINEARREG", _P, {}, {"value": "real"}),
        ("LINEARREG_SLOPE", _P, {}, {"slope": "real"}),
    ], talib_defaults="timeperiod 14 (the node's)", cases=[
        {"period": 14}, {"period": 5}, {"period": 50},
    ]),
}
