// packages/indicators/src/formulas/candlestick_patterns/cdl_takuri.ts
//
// Takuri: the formula, ported from TA-Lib's ta_CDLTAKURI.c.
// Held to its oracle fixture, cdl_takuri.json. PURE.

import { CandleTotal, lowerShadow, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyDoji', 'ShadowVeryShort', 'ShadowVeryLong'));
    const doji = new CandleTotal(bars, 'BodyDoji', start);
    const veryShort = new CandleTotal(bars, 'ShadowVeryShort', start);
    const veryLong = new CandleTotal(bars, 'ShadowVeryLong', start);
    for (let i = start; i < bars.length; i++) {
        const b = bars[i];
        if (realBody(b) <= doji.average(i) && upperShadow(b) < veryShort.average(i) && lowerShadow(b) > veryLong.average(i)) value[i] = 100;
        doji.advance(i);
        veryShort.advance(i);
        veryLong.advance(i);
    }
    return value;
};
