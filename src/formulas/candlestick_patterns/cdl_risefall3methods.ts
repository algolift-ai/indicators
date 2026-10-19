// packages/indicators/src/formulas/candlestick_patterns/cdl_risefall3methods.ts
//
// Three Methods: the formula, ported from TA-Lib's ta_CDLRISEFALL3METHODS.c.
// Held to its oracle fixture, cdl_risefall3methods.json. PURE.

import { candleColor, CandleTotal, cmax, cmin, maxAvgPeriod, patternFrame, realBody } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyShort', 'BodyLong') + 4);
    // The C's BodyPeriodTotal[5]: BodyLong at i - 4 and at i, BodyShort at i - 3, i - 2, i - 1.
    const long4 = new CandleTotal(bars, 'BodyLong', start - 4);
    const short3 = new CandleTotal(bars, 'BodyShort', start - 3);
    const short2 = new CandleTotal(bars, 'BodyShort', start - 2);
    const short1 = new CandleTotal(bars, 'BodyShort', start - 1);
    const long0 = new CandleTotal(bars, 'BodyLong', start);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 4];
        const b2 = bars[i - 3];
        const b3 = bars[i - 2];
        const b4 = bars[i - 1];
        const b5 = bars[i];
        // The C compares prices multiplied by the first candle's colour (exact: a factor of 1 or -1).
        const c = candleColor(b1);
        if (
            candleColor(b1) === -candleColor(b2) &&
            candleColor(b2) === candleColor(b3) &&
            candleColor(b3) === candleColor(b4) &&
            candleColor(b4) === -candleColor(b5) &&
            cmin(b2.open, b2.close) < b1.high &&
            cmax(b2.open, b2.close) > b1.low &&
            cmin(b3.open, b3.close) < b1.high &&
            cmax(b3.open, b3.close) > b1.low &&
            cmin(b4.open, b4.close) < b1.high &&
            cmax(b4.open, b4.close) > b1.low &&
            b3.close * c < b2.close * c &&
            b4.close * c < b3.close * c &&
            b5.open * c > b4.close * c &&
            b5.close * c > b1.close * c &&
            realBody(b1) > long4.average(i - 4) &&
            realBody(b2) < short3.average(i - 3) &&
            realBody(b3) < short2.average(i - 2) &&
            realBody(b4) < short1.average(i - 1) &&
            realBody(b5) > long0.average(i)
        )
            value[i] = 100 * c;
        long4.advance(i - 4);
        short3.advance(i - 3);
        short2.advance(i - 2);
        short1.advance(i - 1);
        long0.advance(i);
    }
    return value;
};
