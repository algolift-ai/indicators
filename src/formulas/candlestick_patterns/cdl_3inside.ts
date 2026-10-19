// packages/indicators/src/formulas/candlestick_patterns/cdl_3inside.ts
//
// Three Inside: the formula, ported from TA-Lib's ta_CDL3INSIDE.c.
// Held to its oracle fixture, cdl_3inside.json. PURE.

import { candleColor, CandleTotal, cmax, cmin, maxAvgPeriod, patternFrame, realBody } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyShort', 'BodyLong') + 2);
    // The long body is judged at i - 2, the short one at i - 1.
    const long = new CandleTotal(bars, 'BodyLong', start - 2);
    const short = new CandleTotal(bars, 'BodyShort', start - 1);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            cmax(b2.close, b2.open) < cmax(b1.close, b1.open) &&
            cmin(b2.close, b2.open) > cmin(b1.close, b1.open) &&
            ((candleColor(b1) === 1 && candleColor(b3) === -1 && b3.close < b1.open) ||
                (candleColor(b1) === -1 && candleColor(b3) === 1 && b3.close > b1.open)) &&
            realBody(b1) > long.average(i - 2) &&
            realBody(b2) <= short.average(i - 1)
        ) value[i] = -candleColor(b1) * 100;
        long.advance(i - 2);
        short.advance(i - 1);
    }
    return value;
};
