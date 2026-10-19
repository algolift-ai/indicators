// packages/indicators/src/formulas/candlestick_patterns/cdl_sticksandwich.ts
//
// Stick Sandwich: the formula, ported from TA-Lib's ta_CDLSTICKSANDWICH.c.
// Held to its oracle fixture, cdl_sticksandwich.json. PURE.

import { avgPeriod, candleColor, CandleTotal, patternFrame } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, avgPeriod('Equal') + 2);
    // Equal is read on the first candle, at i - 2.
    const equal = new CandleTotal(bars, 'Equal', start - 2);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            candleColor(b1) === -1 &&
            candleColor(b2) === 1 &&
            candleColor(b3) === -1 &&
            b2.low > b1.close &&
            b3.close <= b1.close + equal.average(i - 2) &&
            b3.close >= b1.close - equal.average(i - 2)
        ) value[i] = 100;
        equal.advance(i - 2);
    }
    return value;
};
