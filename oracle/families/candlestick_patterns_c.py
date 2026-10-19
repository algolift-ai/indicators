"""Oracles for the candlestick patterns family, part c: thirteen TA-Lib patterns
through `pattern` from candlestick_patterns.py, which turns TA-Lib's lookback
bars into NaN."""

from families.candlestick_patterns import pattern

ORACLES = {
    "cdl_tasukigap": pattern("CDLTASUKIGAP"),
    "cdl_xsidegap3methods": pattern("CDLXSIDEGAP3METHODS"),
    "cdl_breakaway": pattern("CDLBREAKAWAY"),
    "cdl_3blackcrows": pattern("CDL3BLACKCROWS"),
    "cdl_identical3crows": pattern("CDLIDENTICAL3CROWS"),
    "cdl_risefall3methods": pattern("CDLRISEFALL3METHODS"),
    "cdl_mathold": pattern("CDLMATHOLD", penetration=True, cases=[
        {"penetration": 0.5}, {"penetration": 0.0}, {"penetration": 0.8},
    ]),
    "cdl_3starsinsouth": pattern("CDL3STARSINSOUTH"),
    "cdl_stalledpattern": pattern("CDLSTALLEDPATTERN"),
    "cdl_3whitesoldiers": pattern("CDL3WHITESOLDIERS"),
    "cdl_advanceblock": pattern("CDLADVANCEBLOCK"),
    "cdl_hikkake": pattern("CDLHIKKAKE"),
    "cdl_hikkakemod": pattern("CDLHIKKAKEMOD"),
}
