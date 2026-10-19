// packages/indicators/src/formulas/candlestick_patterns/cdl_dojistar.ts
//
// Doji Star: the formula, ported from TA-Lib's ta_CDLDOJISTAR.c.
// Held to its oracle fixture, cdl_dojistar.json. PURE.

import { candleColor, CandleTotal, maxAvgPeriod, patternFrame, realBody, realBodyGapDown, realBodyGapUp } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyDoji', 'BodyLong') + 1);
    // The long candle's body is judged at i - 1, the doji's at i.
    const long = new CandleTotal(bars, 'BodyLong', start - 1);
    const doji = new CandleTotal(bars, 'BodyDoji', start);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 1];
        const b2 = bars[i];
        if (
            realBody(b1) > long.average(i - 1) &&
            realBody(b2) <= doji.average(i) &&
            ((candleColor(b1) === 1 && realBodyGapUp(b2, b1)) || (candleColor(b1) === -1 && realBodyGapDown(b2, b1)))
        ) value[i] = (0 - candleColor(b1)) * 100;
        long.advance(i - 1);
        doji.advance(i);
    }
    return value;
};
