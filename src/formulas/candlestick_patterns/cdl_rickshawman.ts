// packages/indicators/src/formulas/candlestick_patterns/cdl_rickshawman.ts
//
// Rickshaw Man: the formula, ported from TA-Lib's ta_CDLRICKSHAWMAN.c.
// Held to its oracle fixture, cdl_rickshawman.json. PURE.

import { CandleTotal, cmax, cmin, lowerShadow, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyDoji', 'ShadowLong', 'Near'));
    const doji = new CandleTotal(bars, 'BodyDoji', start);
    const shadow = new CandleTotal(bars, 'ShadowLong', start);
    const near = new CandleTotal(bars, 'Near', start);
    for (let i = start; i < bars.length; i++) {
        const b = bars[i];
        if (
            realBody(b) <= doji.average(i) &&
            lowerShadow(b) > shadow.average(i) &&
            upperShadow(b) > shadow.average(i) &&
            // The body near the bar's midpoint, the midpoint computed as the C does.
            cmin(b.open, b.close) <= b.low + (b.high - b.low) / 2 + near.average(i) &&
            cmax(b.open, b.close) >= b.low + (b.high - b.low) / 2 - near.average(i)
        ) value[i] = 100;
        doji.advance(i);
        shadow.advance(i);
        near.advance(i);
    }
    return value;
};
