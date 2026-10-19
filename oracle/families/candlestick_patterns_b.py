"""Oracles for the candlestick patterns family, part b (PORTING.md § 15).

The two-candle patterns (the harami and kicking pairs, the neck and piercing
family) and the short three-candle ones, each TA-Lib's own function through
`pattern` from candlestick_patterns.py, which turns TA-Lib's lookback bars
into NaN. Dark Cloud Cover is the only one with a penetration.
"""

from families.candlestick_patterns import pattern

ORACLES = {
    "cdl_harami": pattern("CDLHARAMI"),
    "cdl_haramicross": pattern("CDLHARAMICROSS"),
    "cdl_3inside": pattern("CDL3INSIDE"),
    "cdl_3outside": pattern("CDL3OUTSIDE"),
    "cdl_homingpigeon": pattern("CDLHOMINGPIGEON"),
    "cdl_kicking": pattern("CDLKICKING"),
    "cdl_kickingbylength": pattern("CDLKICKINGBYLENGTH"),
    "cdl_counterattack": pattern("CDLCOUNTERATTACK"),
    "cdl_inneck": pattern("CDLINNECK"),
    "cdl_onneck": pattern("CDLONNECK"),
    "cdl_thrusting": pattern("CDLTHRUSTING"),
    "cdl_piercing": pattern("CDLPIERCING"),
    # TA-Lib's default penetration is 0.5 (the first candle's midpoint); 0
    # asks only for a close below the first candle's close, 0.8 for a close
    # deep into its body.
    "cdl_darkcloudcover": pattern("CDLDARKCLOUDCOVER", penetration=True, cases=[
        {"penetration": 0.5},
        {"penetration": 0.0},
        {"penetration": 0.8},
    ]),
    "cdl_matchinglow": pattern("CDLMATCHINGLOW"),
    "cdl_separatinglines": pattern("CDLSEPARATINGLINES"),
    "cdl_2crows": pattern("CDL2CROWS"),
    "cdl_upsidegap2crows": pattern("CDLUPSIDEGAP2CROWS"),
    "cdl_unique3river": pattern("CDLUNIQUE3RIVER"),
    "cdl_gapsidesidewhite": pattern("CDLGAPSIDESIDEWHITE"),
    "cdl_sticksandwich": pattern("CDLSTICKSANDWICH"),
}
