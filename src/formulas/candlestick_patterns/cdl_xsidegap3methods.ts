// packages/indicators/src/formulas/candlestick_patterns/cdl_xsidegap3methods.ts
//
// Gap Three Methods: the formula, ported from TA-Lib's ta_CDLXSIDEGAP3METHODS.c.
// Held to its oracle fixture, cdl_xsidegap3methods.json. PURE.

import { candleColor, cmax, cmin, patternFrame, realBodyGapDown, realBodyGapUp } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    // TA_CDLXSIDEGAP3METHODS_Lookback is 2: no averaged setting.
    const { value, start } = patternFrame(bars.length, 2);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            candleColor(b1) === candleColor(b2) &&
            candleColor(b2) === -candleColor(b3) &&
            b3.open < cmax(b2.close, b2.open) &&
            b3.open > cmin(b2.close, b2.open) &&
            b3.close < cmax(b1.close, b1.open) &&
            b3.close > cmin(b1.close, b1.open) &&
            ((candleColor(b1) === 1 && realBodyGapUp(b2, b1)) || (candleColor(b1) === -1 && realBodyGapDown(b2, b1)))
        )
            value[i] = candleColor(b1) * 100;
    }
    return value;
};
