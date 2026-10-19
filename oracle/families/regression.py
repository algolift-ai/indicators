"""Oracles for the regression family (catalog/regression)."""

from oraclelib import talib_oracle

# TA-Lib's three regression readings share one fit; period runs from 2.
# Period 2 reseeds the running sums every 64 bars, so the cases cross several.
CASES = [
    {"period": 14, "source": "close"},
    {"period": 2, "source": "close"},
    {"period": 100, "source": "close"},
    {"period": 9, "source": "hl2"},
]

ORACLES = {
    "linreg_angle": talib_oracle("LINEARREG_ANGLE", cases=CASES),
    "linreg_intercept": talib_oracle("LINEARREG_INTERCEPT", cases=CASES),
    "tsf": talib_oracle("TSF", cases=CASES),
}
