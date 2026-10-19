// packages/indicators/src/formulas/candlestick_patterns/cdl_inneck.ts
//
// In-Neck: the formula, ported from TA-Lib's ta_CDLINNECK.c.
// Held to its oracle fixture, cdl_inneck.json. PURE.

import { candleColor, CandleTotal, maxAvgPeriod, patternFrame, realBody } from '../../core/candles';
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
            b.close <= p.close + equal.average(i - 1) &&
            b.close >= p.close
        ) value[i] = -100;
        equal.advance(i - 1);
        long.advance(i - 1);
    }
    return value;
};
