// packages/indicators/src/formulas/candlestick_patterns/cdl_piercing.ts
//
// Piercing: the formula, ported from TA-Lib's ta_CDLPIERCING.c.
// Held to its oracle fixture, cdl_piercing.json. PURE.

import { candleColor, CandleTotal, fma, maxAvgPeriod, patternFrame, realBody } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyLong') + 1);
    // The C's two-element long totals: [1] judged at i - 1, [0] at i.
    const long1 = new CandleTotal(bars, 'BodyLong', start - 1);
    const long0 = new CandleTotal(bars, 'BodyLong', start);
    for (let i = start; i < bars.length; i++) {
        const p = bars[i - 1];
        const b = bars[i];
        if (
            candleColor(p) === -1 &&
            realBody(p) > long1.average(i - 1) &&
            candleColor(b) === 1 &&
            realBody(b) > long0.average(i) &&
            b.open < p.low &&
            b.close < p.open &&
            b.close > fma(realBody(p), 0.5, p.close)
        ) value[i] = 100;
        long1.advance(i - 1);
        long0.advance(i);
    }
    return value;
};
