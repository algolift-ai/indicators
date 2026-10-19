// packages/indicators/src/formulas/candlestick_patterns/cdl_thrusting.ts
//
// Thrusting: the formula, ported from TA-Lib's ta_CDLTHRUSTING.c.
// Held to its oracle fixture, cdl_thrusting.json. PURE.

import { candleColor, CandleTotal, fma, maxAvgPeriod, patternFrame, realBody } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('Equal', 'BodyLong') + 1);
    // Both totals are read on the first candle.
    const equal = new CandleTotal(bars, 'Equal', start - 1);
    const long = new CandleTotal(bars, 'BodyLong', start - 1);
    for (let i = start; i < bars.length; i++) {
        const p = bars[i - 1];
        const b = bars[i];
        if (
            candleColor(p) === -1 &&
            realBody(p) > long.average(i - 1) &&
            candleColor(b) === 1 &&
            b.open < p.low &&
            b.close > p.close + equal.average(i - 1) &&
            b.close <= fma(realBody(p), 0.5, p.close)
        ) value[i] = -100;
        equal.advance(i - 1);
        long.advance(i - 1);
    }
    return value;
};
