// packages/indicators/src/formulas/candlestick_patterns/cdl_marubozu.ts
//
// Marubozu: the formula, ported from TA-Lib's ta_CDLMARUBOZU.c.
// Held to its oracle fixture, cdl_marubozu.json. PURE.

import { candleColor, CandleTotal, lowerShadow, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyLong', 'ShadowVeryShort'));
    const long = new CandleTotal(bars, 'BodyLong', start);
    const veryShort = new CandleTotal(bars, 'ShadowVeryShort', start);
    for (let i = start; i < bars.length; i++) {
        const b = bars[i];
        if (realBody(b) > long.average(i) && upperShadow(b) < veryShort.average(i) && lowerShadow(b) < veryShort.average(i)) value[i] = candleColor(b) * 100;
        long.advance(i);
        veryShort.advance(i);
    }
    return value;
};
