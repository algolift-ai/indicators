// packages/indicators/src/formulas/candlestick_patterns/cdl_stalledpattern.ts
//
// Stalled Pattern: the formula, ported from TA-Lib's ta_CDLSTALLEDPATTERN.c.
// Held to its oracle fixture, cdl_stalledpattern.json. PURE.

import { candleColor, CandleTotal, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyLong', 'BodyShort', 'ShadowVeryShort', 'Near') + 2);
    // BodyLong and Near on the first two candles (i - 2, i - 1); ShadowVeryShort on the second; BodyShort on the third.
    const long2 = new CandleTotal(bars, 'BodyLong', start - 2);
    const long1 = new CandleTotal(bars, 'BodyLong', start - 1);
    const short = new CandleTotal(bars, 'BodyShort', start);
    const veryShort = new CandleTotal(bars, 'ShadowVeryShort', start - 1);
    const near2 = new CandleTotal(bars, 'Near', start - 2);
    const near1 = new CandleTotal(bars, 'Near', start - 1);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            candleColor(b1) === 1 &&
            candleColor(b2) === 1 &&
            candleColor(b3) === 1 &&
            b3.close > b2.close &&
            b2.close > b1.close &&
            realBody(b1) > long2.average(i - 2) &&
            realBody(b2) > long1.average(i - 1) &&
            upperShadow(b2) < veryShort.average(i - 1) &&
            b2.open > b1.open &&
            b2.open <= b1.close + near2.average(i - 2) &&
            realBody(b3) < short.average(i) &&
            b3.open >= b2.close - realBody(b3) - near1.average(i - 1)
        )
            value[i] = -100;
        long2.advance(i - 2);
        near2.advance(i - 2);
        long1.advance(i - 1);
        near1.advance(i - 1);
        short.advance(i);
        veryShort.advance(i - 1);
    }
    return value;
};
