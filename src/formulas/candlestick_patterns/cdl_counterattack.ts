// packages/indicators/src/formulas/candlestick_patterns/cdl_counterattack.ts
//
// Counterattack: the formula, ported from TA-Lib's ta_CDLCOUNTERATTACK.c.
// Held to its oracle fixture, cdl_counterattack.json. PURE.

import { candleColor, CandleTotal, maxAvgPeriod, patternFrame, realBody } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('Equal', 'BodyLong') + 1);
    // Equal is read on the first candle; the C's long totals: [1] at i - 1, [0] at i.
    const equal = new CandleTotal(bars, 'Equal', start - 1);
    const long1 = new CandleTotal(bars, 'BodyLong', start - 1);
    const long0 = new CandleTotal(bars, 'BodyLong', start);
    for (let i = start; i < bars.length; i++) {
        const p = bars[i - 1];
        const b = bars[i];
        if (
            candleColor(p) === -candleColor(b) &&
            realBody(p) > long1.average(i - 1) &&
            realBody(b) > long0.average(i) &&
            b.close <= p.close + equal.average(i - 1) &&
            b.close >= p.close - equal.average(i - 1)
        ) value[i] = candleColor(b) * 100;
        equal.advance(i - 1);
        long1.advance(i - 1);
        long0.advance(i);
    }
    return value;
};
