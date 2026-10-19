// packages/indicators/src/formulas/candlestick_patterns/cdl_advanceblock.ts
//
// Advance Block: the formula, ported from TA-Lib's ta_CDLADVANCEBLOCK.c.
// Held to its oracle fixture, cdl_advanceblock.json. PURE.

import { candleColor, CandleTotal, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('ShadowLong', 'ShadowShort', 'Far', 'Near', 'BodyLong') + 2);
    // The C's totals: ShadowShort[3] at i - 2, i - 1, i; ShadowLong[2] at i - 1, i; Near[3] and Far[3],
    // of which only [2] and [1] (i - 2, i - 1) are summed and read; BodyLong at i - 2.
    const ss2 = new CandleTotal(bars, 'ShadowShort', start - 2);
    const ss1 = new CandleTotal(bars, 'ShadowShort', start - 1);
    const ss0 = new CandleTotal(bars, 'ShadowShort', start);
    const sl1 = new CandleTotal(bars, 'ShadowLong', start - 1);
    const sl0 = new CandleTotal(bars, 'ShadowLong', start);
    const near2 = new CandleTotal(bars, 'Near', start - 2);
    const near1 = new CandleTotal(bars, 'Near', start - 1);
    const far2 = new CandleTotal(bars, 'Far', start - 2);
    const far1 = new CandleTotal(bars, 'Far', start - 1);
    const long = new CandleTotal(bars, 'BodyLong', start - 2);
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
            b2.open > b1.open &&
            b2.open <= b1.close + near2.average(i - 2) &&
            b3.open > b2.open &&
            b3.open <= b2.close + near1.average(i - 1) &&
            realBody(b1) > long.average(i - 2) &&
            upperShadow(b1) < ss2.average(i - 2) &&
            ((realBody(b2) < realBody(b1) - far2.average(i - 2) && realBody(b3) < realBody(b2) + near1.average(i - 1)) ||
                realBody(b3) < realBody(b2) - far1.average(i - 1) ||
                (realBody(b3) < realBody(b2) &&
                    realBody(b2) < realBody(b1) &&
                    (upperShadow(b3) > ss0.average(i) || upperShadow(b2) > ss1.average(i - 1))) ||
                (realBody(b3) < realBody(b2) && upperShadow(b3) > sl0.average(i)))
        )
            value[i] = -100;
        ss2.advance(i - 2);
        ss1.advance(i - 1);
        ss0.advance(i);
        sl1.advance(i - 1);
        sl0.advance(i);
        far2.advance(i - 2);
        near2.advance(i - 2);
        far1.advance(i - 1);
        near1.advance(i - 1);
        long.advance(i - 2);
    }
    return value;
};
