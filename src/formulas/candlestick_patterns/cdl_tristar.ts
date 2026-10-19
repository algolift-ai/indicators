// packages/indicators/src/formulas/candlestick_patterns/cdl_tristar.ts
//
// Tristar Pattern: the formula, ported from TA-Lib's ta_CDLTRISTAR.c.
// Held to its oracle fixture, cdl_tristar.json. PURE.

import { avgPeriod, CandleTotal, cmax, cmin, patternFrame, realBody, realBodyGapDown, realBodyGapUp } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, avgPeriod('BodyDoji') + 2);
    // One total, read at the first doji, judges all three bodies.
    const doji = new CandleTotal(bars, 'BodyDoji', start - 2);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (realBody(b1) <= doji.average(i - 2) && realBody(b2) <= doji.average(i - 2) && realBody(b3) <= doji.average(i - 2)) {
            value[i] = 0;
            if (realBodyGapUp(b2, b1) && cmax(b3.open, b3.close) < cmax(b2.open, b2.close)) value[i] = -100;
            if (realBodyGapDown(b2, b1) && cmin(b3.open, b3.close) > cmin(b2.open, b2.close)) value[i] = 100;
        }
        doji.advance(i - 2);
    }
    return value;
};
