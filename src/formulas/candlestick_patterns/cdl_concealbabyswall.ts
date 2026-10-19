// packages/indicators/src/formulas/candlestick_patterns/cdl_concealbabyswall.ts
//
// Concealing Baby Swallow: the formula, ported from TA-Lib's ta_CDLCONCEALBABYSWALL.c.
// Held to its oracle fixture, cdl_concealbabyswall.json. PURE.

import { avgPeriod, candleColor, CandleTotal, lowerShadow, patternFrame, realBodyGapDown, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, avgPeriod('ShadowVeryShort') + 3);
    // The C's ShadowVeryShortPeriodTotal[3], [2] and [1], read at i - 3, i - 2 and i - 1.
    const t3 = new CandleTotal(bars, 'ShadowVeryShort', start - 3);
    const t2 = new CandleTotal(bars, 'ShadowVeryShort', start - 2);
    const t1 = new CandleTotal(bars, 'ShadowVeryShort', start - 1);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 3];
        const b2 = bars[i - 2];
        const b3 = bars[i - 1];
        const b4 = bars[i];
        if (
            candleColor(b1) === -1 &&
            candleColor(b2) === -1 &&
            candleColor(b3) === -1 &&
            candleColor(b4) === -1 &&
            lowerShadow(b1) < t3.average(i - 3) &&
            upperShadow(b1) < t3.average(i - 3) &&
            lowerShadow(b2) < t2.average(i - 2) &&
            upperShadow(b2) < t2.average(i - 2) &&
            realBodyGapDown(b3, b2) &&
            upperShadow(b3) > t1.average(i - 1) &&
            b3.high > b2.close &&
            b4.high > b3.high &&
            b4.low < b3.low
        ) value[i] = 100;
        t3.advance(i - 3);
        t2.advance(i - 2);
        t1.advance(i - 1);
    }
    return value;
};
