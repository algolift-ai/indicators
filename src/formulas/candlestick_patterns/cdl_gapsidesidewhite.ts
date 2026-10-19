// packages/indicators/src/formulas/candlestick_patterns/cdl_gapsidesidewhite.ts
//
// Side-by-Side White Lines: the formula, ported from TA-Lib's ta_CDLGAPSIDESIDEWHITE.c.
// Held to its oracle fixture, cdl_gapsidesidewhite.json. PURE.

import { candleColor, CandleTotal, maxAvgPeriod, patternFrame, realBody, realBodyGapDown, realBodyGapUp } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('Near', 'Equal') + 2);
    // Near and Equal are both read on the second candle, at i - 1.
    const near = new CandleTotal(bars, 'Near', start - 1);
    const equal = new CandleTotal(bars, 'Equal', start - 1);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            ((realBodyGapUp(b2, b1) && realBodyGapUp(b3, b1)) || (realBodyGapDown(b2, b1) && realBodyGapDown(b3, b1))) &&
            candleColor(b2) === 1 &&
            candleColor(b3) === 1 &&
            realBody(b3) >= realBody(b2) - near.average(i - 1) &&
            realBody(b3) <= realBody(b2) + near.average(i - 1) &&
            b3.open >= b2.open - equal.average(i - 1) &&
            b3.open <= b2.open + equal.average(i - 1)
        ) value[i] = realBodyGapUp(b2, b1) ? 100 : -100;
        near.advance(i - 1);
        equal.advance(i - 1);
    }
    return value;
};
