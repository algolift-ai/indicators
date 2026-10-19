// packages/indicators/src/formulas/candlestick_patterns/cdl_breakaway.ts
//
// Breakaway: the formula, ported from TA-Lib's ta_CDLBREAKAWAY.c.
// Held to its oracle fixture, cdl_breakaway.json. PURE.

import { candleColor, CandleTotal, maxAvgPeriod, patternFrame, realBody, realBodyGapDown, realBodyGapUp } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyLong') + 4);
    // BodyLong is read on the first candle, i - 4.
    const long = new CandleTotal(bars, 'BodyLong', start - 4);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 4];
        const b2 = bars[i - 3];
        const b3 = bars[i - 2];
        const b4 = bars[i - 1];
        const b5 = bars[i];
        if (
            candleColor(b1) === candleColor(b2) &&
            candleColor(b2) === candleColor(b4) &&
            candleColor(b4) === -candleColor(b5) &&
            realBody(b1) > long.average(i - 4) &&
            ((candleColor(b1) === -1 &&
                realBodyGapDown(b2, b1) &&
                b3.high < b2.high &&
                b3.low < b2.low &&
                b4.high < b3.high &&
                b4.low < b3.low &&
                b5.close > b2.open &&
                b5.close < b1.close) ||
                (candleColor(b1) === 1 &&
                    realBodyGapUp(b2, b1) &&
                    b3.high > b2.high &&
                    b3.low > b2.low &&
                    b4.high > b3.high &&
                    b4.low > b3.low &&
                    b5.close < b2.open &&
                    b5.close > b1.close))
        )
            value[i] = candleColor(b5) * 100;
        long.advance(i - 4);
    }
    return value;
};
