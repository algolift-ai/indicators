"""Oracles for the candlestick patterns family, part a (PORTING.md § 15).

Eighteen TA-Lib patterns, declared with `pattern` from
candlestick_patterns.py (which turns TA-Lib's lookback bars into NaN), and
the two Tweezers, which no installed library computes: technicalindicators
3.1.0 (JS) defines them, so each is written again here in numpy from that
package's rule (lib/candlestick/TweezerBottom.js, TweezerTop.js, with
lib/Utils/AverageGain.js and AverageLoss.js), never from the TypeScript.
"""

import numpy as np

from families.candlestick_patterns import pattern
from oraclelib import concept_oracle

# TA-Lib's default penetration is 0.3 for all three; 0 asks only for a close
# beyond the first candle's close, 0.6 for a close deep into its body.
PENETRATION_CASES = [
    {"penetration": 0.3},
    {"penetration": 0.0},
    {"penetration": 0.6},
]


# ------------------------------------------------------------------ the Tweezers

TWEEZER_SOURCE = (
    "technicalindicators 3.1.0 (MIT), lib/candlestick/TweezerBottom.js and TweezerTop.js: "
    "a pattern needs 5 bars; over the closes of the window's first three bars, "
    "averagegain and averageloss with period 2 (the mean of the two positive moves, "
    "and of the two negative ones); a bottom when the average loss is above the "
    "average gain and the last two lows are equal, a top when the average gain is "
    "above the average loss and the last two highs are equal"
)

TWEEZER_NOTE = (
    "The library compares averagegain's and averageloss's result ARRAYS with `>`, "
    "which JavaScript does on their strings (\"9\" > \"10\"); the reference compares "
    "the numbers, as the rule means. NaN before the fifth bar (the library needs 5); "
    "100 for a bottom, -100 for a top, 0 elsewhere. On the shared bars it fires only "
    "on the flat stretch (bars 200 to 214), once each."
)


def _tweezer(bars, s, *, top: bool):
    close = np.asarray(bars["close"], dtype=np.float64)
    level = np.asarray(bars["high" if top else "low"], dtype=np.float64)
    n = len(close)
    out = np.full(n, np.nan)
    for i in range(4, n):
        # The window is bars i-4 .. i; its first three closes are the trend.
        c = close[i - 4 : i - 1]
        moves = np.diff(c)
        gain = np.where(moves > 0, moves, 0.0).sum() / 2.0
        loss = np.where(moves < 0, -moves, 0.0).sum() / 2.0
        trend = gain > loss if top else loss > gain
        out[i] = (-100.0 if top else 100.0) if (trend and level[i - 1] == level[i]) else 0.0
    return {"value": out}


def tweezer_bottom(bars, s):
    return _tweezer(bars, s, top=False)


def tweezer_top(bars, s):
    return _tweezer(bars, s, top=True)


ORACLES = {
    "cdl_highwave": pattern("CDLHIGHWAVE"),
    "cdl_longleggeddoji": pattern("CDLLONGLEGGEDDOJI"),
    "cdl_longline": pattern("CDLLONGLINE"),
    "cdl_shortline": pattern("CDLSHORTLINE"),
    "cdl_belthold": pattern("CDLBELTHOLD"),
    "cdl_closingmarubozu": pattern("CDLCLOSINGMARUBOZU"),
    "cdl_takuri": pattern("CDLTAKURI"),
    "cdl_rickshawman": pattern("CDLRICKSHAWMAN"),
    "cdl_invertedhammer": pattern("CDLINVERTEDHAMMER"),
    "cdl_hangingman": pattern("CDLHANGINGMAN"),
    "cdl_dojistar": pattern("CDLDOJISTAR"),
    "cdl_tristar": pattern("CDLTRISTAR"),
    "cdl_morningdojistar": pattern("CDLMORNINGDOJISTAR", penetration=True, cases=PENETRATION_CASES),
    "cdl_eveningdojistar": pattern("CDLEVENINGDOJISTAR", penetration=True, cases=PENETRATION_CASES),
    "cdl_abandonedbaby": pattern("CDLABANDONEDBABY", penetration=True, cases=PENETRATION_CASES),
    "cdl_ladderbottom": pattern("CDLLADDERBOTTOM"),
    "cdl_concealbabyswall": pattern("CDLCONCEALBABYSWALL"),
    "cdl_3linestrike": pattern("CDL3LINESTRIKE"),
    # No settings: three identical default cases (PORTING.md § 6).
    "cdl_tweezer_bottom": concept_oracle(
        tweezer_bottom, cases=[{}, {}, {}], source=TWEEZER_SOURCE, inputs=("low", "close"), note=TWEEZER_NOTE,
    ),
    "cdl_tweezer_top": concept_oracle(
        tweezer_top, cases=[{}, {}, {}], source=TWEEZER_SOURCE, inputs=("high", "close"), note=TWEEZER_NOTE,
    ),
}
