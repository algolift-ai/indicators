// packages/indicators/src/formulas/candlestick_patterns/cdl_dragonflydoji.ts
//
// Dragonfly Doji: the formula, ported from TA-Lib's ta_CDLDRAGONFLYDOJI.c.
// Held to its oracle fixture, cdl_dragonflydoji.json. PURE.

import { CandleTotal, lowerShadow, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyDoji', 'ShadowVeryShort'));
    const doji = new CandleTotal(bars, 'BodyDoji', start);
    const veryShort = new CandleTotal(bars, 'ShadowVeryShort', start);
    for (let i = start; i < bars.length; i++) {
        const b = bars[i];
        if (realBody(b) <= doji.average(i) && upperShadow(b) < veryShort.average(i) && lowerShadow(b) > veryShort.average(i)) value[i] = 100;
        doji.advance(i);
        veryShort.advance(i);
    }
    return value;
};
