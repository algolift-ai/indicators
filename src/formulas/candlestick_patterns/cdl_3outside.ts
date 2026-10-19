// packages/indicators/src/formulas/candlestick_patterns/cdl_3outside.ts
//
// Three Outside: the formula, ported from TA-Lib's ta_CDL3OUTSIDE.c.
// Held to its oracle fixture, cdl_3outside.json. PURE.

import { candleColor, patternFrame } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    // TA_CDL3OUTSIDE_Lookback is 3, though the pattern reads two bars back.
    const { value, start } = patternFrame(bars.length, 3);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            (candleColor(b2) === 1 &&
                candleColor(b1) === -1 &&
                b2.close > b1.open &&
                b2.open < b1.close &&
                b3.close > b2.close) ||
            (candleColor(b2) === -1 &&
                candleColor(b1) === 1 &&
                b2.open > b1.close &&
                b2.close < b1.open &&
                b3.close < b2.close)
        ) value[i] = candleColor(b2) * 100;
    }
    return value;
};
