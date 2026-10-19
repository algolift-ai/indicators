// packages/indicators/src/formulas/candlestick_patterns/cdl_tasukigap.ts
//
// Tasuki Gap: the formula, ported from TA-Lib's ta_CDLTASUKIGAP.c.
// Held to its oracle fixture, cdl_tasukigap.json. PURE.

import { candleColor, CandleTotal, cmax, cmin, maxAvgPeriod, patternFrame, realBody, realBodyGapDown, realBodyGapUp } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('Near') + 2);
    // Near is read on the gapping candle, i - 1.
    const near = new CandleTotal(bars, 'Near', start - 1);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            (realBodyGapUp(b2, b1) &&
                candleColor(b2) === 1 &&
                candleColor(b3) === -1 &&
                b3.open < b2.close &&
                b3.open > b2.open &&
                b3.close < b2.open &&
                b3.close > cmax(b1.close, b1.open) &&
                Math.abs(realBody(b2) - realBody(b3)) < near.average(i - 1)) ||
            (realBodyGapDown(b2, b1) &&
                candleColor(b2) === -1 &&
                candleColor(b3) === 1 &&
                b3.open < b2.open &&
                b3.open > b2.close &&
                b3.close > b2.open &&
                b3.close < cmin(b1.close, b1.open) &&
                Math.abs(realBody(b2) - realBody(b3)) < near.average(i - 1))
        )
            value[i] = candleColor(b2) * 100;
        near.advance(i - 1);
    }
    return value;
};
