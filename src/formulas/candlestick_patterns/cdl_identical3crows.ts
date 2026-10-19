// packages/indicators/src/formulas/candlestick_patterns/cdl_identical3crows.ts
//
// Identical Three Crows: the formula, ported from TA-Lib's ta_CDLIDENTICAL3CROWS.c.
// Held to its oracle fixture, cdl_identical3crows.json. PURE.

import { candleColor, CandleTotal, lowerShadow, maxAvgPeriod, patternFrame } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('ShadowVeryShort', 'Equal') + 2);
    // ShadowVeryShort read on each crow (i - 2, i - 1, i); Equal on the first two (i - 2, i - 1).
    const vs2 = new CandleTotal(bars, 'ShadowVeryShort', start - 2);
    const vs1 = new CandleTotal(bars, 'ShadowVeryShort', start - 1);
    const vs0 = new CandleTotal(bars, 'ShadowVeryShort', start);
    const eq2 = new CandleTotal(bars, 'Equal', start - 2);
    const eq1 = new CandleTotal(bars, 'Equal', start - 1);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            candleColor(b1) === -1 &&
            lowerShadow(b1) < vs2.average(i - 2) &&
            candleColor(b2) === -1 &&
            lowerShadow(b2) < vs1.average(i - 1) &&
            candleColor(b3) === -1 &&
            lowerShadow(b3) < vs0.average(i) &&
            b1.close > b2.close &&
            b2.close > b3.close &&
            b2.open <= b1.close + eq2.average(i - 2) &&
            b2.open >= b1.close - eq2.average(i - 2) &&
            b3.open <= b2.close + eq1.average(i - 1) &&
            b3.open >= b2.close - eq1.average(i - 1)
        )
            value[i] = -100;
        vs2.advance(i - 2);
        vs1.advance(i - 1);
        vs0.advance(i);
        eq2.advance(i - 2);
        eq1.advance(i - 1);
    }
    return value;
};
