// packages/indicators/src/formulas/candlestick_patterns/cdl_2crows.ts
//
// Two Crows: the formula, ported from TA-Lib's ta_CDL2CROWS.c.
// Held to its oracle fixture, cdl_2crows.json. PURE.

import { avgPeriod, candleColor, CandleTotal, patternFrame, realBody, realBodyGapUp } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, avgPeriod('BodyLong') + 2);
    // The long body is judged on the first candle, at i - 2.
    const long = new CandleTotal(bars, 'BodyLong', start - 2);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            candleColor(b1) === 1 &&
            realBody(b1) > long.average(i - 2) &&
            candleColor(b2) === -1 &&
            realBodyGapUp(b2, b1) &&
            candleColor(b3) === -1 &&
            b3.open < b2.open &&
            b3.open > b2.close &&
            b3.close > b1.open &&
            b3.close < b1.close
        ) value[i] = -100;
        long.advance(i - 2);
    }
    return value;
};
