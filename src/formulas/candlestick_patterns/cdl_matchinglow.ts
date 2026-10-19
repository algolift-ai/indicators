// packages/indicators/src/formulas/candlestick_patterns/cdl_matchinglow.ts
//
// Matching Low: the formula, ported from TA-Lib's ta_CDLMATCHINGLOW.c.
// Held to its oracle fixture, cdl_matchinglow.json. PURE.

import { avgPeriod, candleColor, CandleTotal, patternFrame } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, avgPeriod('Equal') + 1);
    // Equal is read on the first candle.
    const equal = new CandleTotal(bars, 'Equal', start - 1);
    for (let i = start; i < bars.length; i++) {
        const p = bars[i - 1];
        const b = bars[i];
        if (
            candleColor(p) === -1 &&
            candleColor(b) === -1 &&
            b.close <= p.close + equal.average(i - 1) &&
            b.close >= p.close - equal.average(i - 1)
        ) value[i] = 100;
        equal.advance(i - 1);
    }
    return value;
};
