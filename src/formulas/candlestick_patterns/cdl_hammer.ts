// packages/indicators/src/formulas/candlestick_patterns/cdl_hammer.ts
//
// Hammer: the formula, ported from TA-Lib's ta_CDLHAMMER.c.
// Held to its oracle fixture, cdl_hammer.json. PURE.

import { CandleTotal, cmin, lowerShadow, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyShort', 'ShadowLong', 'ShadowVeryShort', 'Near') + 1);
    const body = new CandleTotal(bars, 'BodyShort', start);
    const shadowLong = new CandleTotal(bars, 'ShadowLong', start);
    const veryShort = new CandleTotal(bars, 'ShadowVeryShort', start);
    // Near is read on the previous bar.
    const near = new CandleTotal(bars, 'Near', start - 1);
    for (let i = start; i < bars.length; i++) {
        const b = bars[i];
        if (
            realBody(b) < body.average(i) &&
            lowerShadow(b) > shadowLong.average(i) &&
            upperShadow(b) < veryShort.average(i) &&
            cmin(b.close, b.open) <= bars[i - 1].low + near.average(i - 1)
        ) value[i] = 100;
        body.advance(i);
        shadowLong.advance(i);
        veryShort.advance(i);
        near.advance(i - 1);
    }
    return value;
};
