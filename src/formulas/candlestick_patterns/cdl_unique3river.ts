// packages/indicators/src/formulas/candlestick_patterns/cdl_unique3river.ts
//
// Unique 3 River: the formula, ported from TA-Lib's ta_CDLUNIQUE3RIVER.c.
// Held to its oracle fixture, cdl_unique3river.json. PURE.

import { candleColor, CandleTotal, maxAvgPeriod, patternFrame, realBody } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyShort', 'BodyLong') + 2);
    // The long body is judged at i - 2, the short one at i.
    const long = new CandleTotal(bars, 'BodyLong', start - 2);
    const short = new CandleTotal(bars, 'BodyShort', start);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            candleColor(b1) === -1 &&
            candleColor(b2) === -1 &&
            candleColor(b3) === 1 &&
            b2.close > b1.close &&
            b2.open <= b1.open &&
            b2.low < b1.low &&
            b3.open > b2.low &&
            realBody(b1) > long.average(i - 2) &&
            realBody(b3) < short.average(i)
        ) value[i] = 100;
        long.advance(i - 2);
        short.advance(i);
    }
    return value;
};
