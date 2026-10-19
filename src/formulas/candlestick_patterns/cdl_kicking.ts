// packages/indicators/src/formulas/candlestick_patterns/cdl_kicking.ts
//
// Kicking: the formula, ported from TA-Lib's ta_CDLKICKING.c.
// Held to its oracle fixture, cdl_kicking.json. PURE.

import { candleColor, candleGapDown, candleGapUp, CandleTotal, lowerShadow, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('ShadowVeryShort', 'BodyLong') + 1);
    // The C's two-element totals: [1] judged at i - 1, [0] at i.
    const shadow1 = new CandleTotal(bars, 'ShadowVeryShort', start - 1);
    const shadow0 = new CandleTotal(bars, 'ShadowVeryShort', start);
    const long1 = new CandleTotal(bars, 'BodyLong', start - 1);
    const long0 = new CandleTotal(bars, 'BodyLong', start);
    for (let i = start; i < bars.length; i++) {
        const p = bars[i - 1];
        const b = bars[i];
        if (
            candleColor(p) === -candleColor(b) &&
            realBody(p) > long1.average(i - 1) &&
            upperShadow(p) < shadow1.average(i - 1) &&
            lowerShadow(p) < shadow1.average(i - 1) &&
            realBody(b) > long0.average(i) &&
            upperShadow(b) < shadow0.average(i) &&
            lowerShadow(b) < shadow0.average(i) &&
            ((candleColor(p) === -1 && candleGapUp(b, p)) || (candleColor(p) === 1 && candleGapDown(b, p)))
        ) value[i] = candleColor(b) * 100;
        long1.advance(i - 1);
        shadow1.advance(i - 1);
        long0.advance(i);
        shadow0.advance(i);
    }
    return value;
};
