// packages/indicators/src/formulas/candlestick_patterns/cdl_3starsinsouth.ts
//
// Three Stars In The South: the formula, ported from TA-Lib's ta_CDL3STARSINSOUTH.c.
// Held to its oracle fixture, cdl_3starsinsouth.json. PURE.

import { candleColor, CandleTotal, lowerShadow, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('ShadowVeryShort', 'ShadowLong', 'BodyLong', 'BodyShort') + 2);
    // BodyLong and ShadowLong on the first candle (i - 2); ShadowVeryShort on the second and third; BodyShort on the third.
    const long = new CandleTotal(bars, 'BodyLong', start - 2);
    const shadowLong = new CandleTotal(bars, 'ShadowLong', start - 2);
    const vs1 = new CandleTotal(bars, 'ShadowVeryShort', start - 1);
    const vs0 = new CandleTotal(bars, 'ShadowVeryShort', start);
    const short = new CandleTotal(bars, 'BodyShort', start);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            candleColor(b1) === -1 &&
            candleColor(b2) === -1 &&
            candleColor(b3) === -1 &&
            realBody(b1) > long.average(i - 2) &&
            lowerShadow(b1) > shadowLong.average(i - 2) &&
            realBody(b2) < realBody(b1) &&
            b2.open > b1.close &&
            b2.open <= b1.high &&
            b2.low < b1.close &&
            b2.low >= b1.low &&
            lowerShadow(b2) > vs1.average(i - 1) &&
            realBody(b3) < short.average(i) &&
            lowerShadow(b3) < vs0.average(i) &&
            upperShadow(b3) < vs0.average(i) &&
            b3.low > b2.low &&
            b3.high < b2.high
        )
            value[i] = 100;
        long.advance(i - 2);
        shadowLong.advance(i - 2);
        vs1.advance(i - 1);
        vs0.advance(i);
        short.advance(i);
    }
    return value;
};
