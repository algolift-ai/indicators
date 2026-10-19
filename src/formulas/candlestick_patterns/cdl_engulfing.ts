// packages/indicators/src/formulas/candlestick_patterns/cdl_engulfing.ts
//
// Engulfing: the formula, ported from TA-Lib's ta_CDLENGULFING.c.
// Held to its oracle fixture, cdl_engulfing.json. PURE.

import { candleColor, patternFrame } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    // TA_CDLENGULFING_Lookback is 2, though the pattern reads only one bar back.
    const { value, start } = patternFrame(bars.length, 2);
    for (let i = start; i < bars.length; i++) {
        const b = bars[i];
        const p = bars[i - 1];
        if (
            (candleColor(b) === 1 &&
                candleColor(p) === -1 &&
                ((b.close >= p.open && b.open < p.close) || (b.close > p.open && b.open <= p.close))) ||
            (candleColor(b) === -1 &&
                candleColor(p) === 1 &&
                ((b.open >= p.close && b.close < p.open) || (b.open > p.close && b.close <= p.open)))
        ) {
            value[i] = candleColor(b) * (b.open !== p.close && b.close !== p.open ? 100 : 80);
        }
    }
    return value;
};
