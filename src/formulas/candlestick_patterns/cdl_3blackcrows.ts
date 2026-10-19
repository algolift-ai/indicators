// packages/indicators/src/formulas/candlestick_patterns/cdl_3blackcrows.ts
//
// Three Black Crows: the formula, ported from TA-Lib's ta_CDL3BLACKCROWS.c.
// Held to its oracle fixture, cdl_3blackcrows.json. PURE.

import { candleColor, CandleTotal, lowerShadow, maxAvgPeriod, patternFrame } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('ShadowVeryShort') + 3);
    // One ShadowVeryShort total per crow, read at i - 2, i - 1 and i.
    const vs2 = new CandleTotal(bars, 'ShadowVeryShort', start - 2);
    const vs1 = new CandleTotal(bars, 'ShadowVeryShort', start - 1);
    const vs0 = new CandleTotal(bars, 'ShadowVeryShort', start);
    for (let i = start; i < bars.length; i++) {
        const b0 = bars[i - 3];
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            candleColor(b0) === 1 &&
            candleColor(b1) === -1 &&
            candleColor(b2) === -1 &&
            candleColor(b3) === -1 &&
            b2.open < b1.open &&
            b2.open > b1.close &&
            b3.open < b2.open &&
            b3.open > b2.close &&
            b0.high > b1.close &&
            b1.close > b2.close &&
            b2.close > b3.close &&
            lowerShadow(b1) < vs2.average(i - 2) &&
            lowerShadow(b2) < vs1.average(i - 1) &&
            lowerShadow(b3) < vs0.average(i)
        )
            value[i] = -100;
        vs2.advance(i - 2);
        vs1.advance(i - 1);
        vs0.advance(i);
    }
    return value;
};
