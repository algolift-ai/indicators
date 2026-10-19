// packages/indicators/src/formulas/candlestick_patterns/cdl_invertedhammer.ts
//
// Inverted Hammer: the formula, ported from TA-Lib's ta_CDLINVERTEDHAMMER.c.
// Held to its oracle fixture, cdl_invertedhammer.json. PURE.

import { CandleTotal, lowerShadow, maxAvgPeriod, patternFrame, realBody, realBodyGapDown, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyShort', 'ShadowLong', 'ShadowVeryShort') + 1);
    const body = new CandleTotal(bars, 'BodyShort', start);
    const shadowLong = new CandleTotal(bars, 'ShadowLong', start);
    const veryShort = new CandleTotal(bars, 'ShadowVeryShort', start);
    for (let i = start; i < bars.length; i++) {
        const b = bars[i];
        if (
            realBodyGapDown(b, bars[i - 1]) &&
            realBody(b) < body.average(i) &&
            upperShadow(b) > shadowLong.average(i) &&
            lowerShadow(b) < veryShort.average(i)
        ) value[i] = 100;
        body.advance(i);
        shadowLong.advance(i);
        veryShort.advance(i);
    }
    return value;
};
