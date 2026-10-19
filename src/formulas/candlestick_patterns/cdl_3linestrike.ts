// packages/indicators/src/formulas/candlestick_patterns/cdl_3linestrike.ts
//
// Three-Line Strike: the formula, ported from TA-Lib's ta_CDL3LINESTRIKE.c.
// Held to its oracle fixture, cdl_3linestrike.json. PURE.

import { avgPeriod, candleColor, CandleTotal, cmax, cmin, patternFrame } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, avgPeriod('Near') + 3);
    // The C's NearPeriodTotal[3] and [2], read at i - 3 and i - 2.
    const t3 = new CandleTotal(bars, 'Near', start - 3);
    const t2 = new CandleTotal(bars, 'Near', start - 2);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 3];
        const b2 = bars[i - 2];
        const b3 = bars[i - 1];
        const b4 = bars[i];
        if (
            candleColor(b1) === candleColor(b2) &&
            candleColor(b2) === candleColor(b3) &&
            candleColor(b4) === 0 - candleColor(b3) &&
            b2.open >= cmin(b1.open, b1.close) - t3.average(i - 3) &&
            b2.open <= cmax(b1.open, b1.close) + t3.average(i - 3) &&
            b3.open >= cmin(b2.open, b2.close) - t2.average(i - 2) &&
            b3.open <= cmax(b2.open, b2.close) + t2.average(i - 2) &&
            ((candleColor(b3) === 1 && b3.close > b2.close && b2.close > b1.close && b4.open > b3.close && b4.close < b1.open) ||
                (candleColor(b3) === -1 && b3.close < b2.close && b2.close < b1.close && b4.open < b3.close && b4.close > b1.open))
        ) value[i] = candleColor(b3) * 100;
        t3.advance(i - 3);
        t2.advance(i - 2);
    }
    return value;
};
