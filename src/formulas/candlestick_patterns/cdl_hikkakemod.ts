// packages/indicators/src/formulas/candlestick_patterns/cdl_hikkakemod.ts
//
// Modified Hikkake Pattern: the formula, ported from TA-Lib's ta_CDLHIKKAKEMOD.c.
// Held to its oracle fixture, cdl_hikkakemod.json. PURE.

import { avgPeriod, CandleTotal, cmax, patternFrame } from '../../core/candles';
import type { PatternFormula, SpecBar } from '../../types';

/** Two inside bars in a row, the first closing near its low (or high), then a breakout of the second downward (or upward). */
function isModifiedHikkake(bars: SpecBar[], i: number, nearAvg: number): boolean {
    return (
        bars[i - 2].high < bars[i - 3].high &&
        bars[i - 2].low > bars[i - 3].low &&
        bars[i - 1].high < bars[i - 2].high &&
        bars[i - 1].low > bars[i - 2].low &&
        ((bars[i].high < bars[i - 1].high && bars[i].low < bars[i - 1].low && bars[i - 2].close <= bars[i - 2].low + nearAvg) ||
            (bars[i].high > bars[i - 1].high && bars[i].low > bars[i - 1].low && bars[i - 2].close >= bars[i - 2].high - nearAvg))
    );
}

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const n = bars.length;
    const { value, start } = patternFrame(n, cmax(1, avgPeriod('Near')) + 5);
    if (start >= n) return value;
    // Near is read on the first inside bar (i - 2), from the warm-up's first bar, start - 3.
    const near = new CandleTotal(bars, 'Near', start - 3 - 2);
    let patternResult = 0;
    let patternHigh = 0.0;
    let patternLow = 0.0;
    let patternCount = 0;
    // The C's warm-up: the three bars before startIdx set the state, writing nothing.
    for (let i = start - 3; i < start; i++) {
        if (isModifiedHikkake(bars, i, near.average(i - 2))) {
            patternResult = 100 * (bars[i].high < bars[i - 1].high ? 1 : -1);
            patternHigh = bars[i - 1].high;
            patternLow = bars[i - 1].low;
            patternCount = 4;
        } else if (
            patternCount > 0 &&
            ((patternResult > 0 && bars[i].close > patternHigh) || (patternResult < 0 && bars[i].close < patternLow))
        ) {
            patternCount = 0;
        }
        near.advance(i - 2);
        if (patternCount > 0) patternCount -= 1;
    }
    for (let i = start; i < n; i++) {
        if (isModifiedHikkake(bars, i, near.average(i - 2))) {
            patternResult = 100 * (bars[i].high < bars[i - 1].high ? 1 : -1);
            patternHigh = bars[i - 1].high;
            patternLow = bars[i - 1].low;
            patternCount = 4;
            value[i] = patternResult;
        } else if (
            patternCount > 0 &&
            ((patternResult > 0 && bars[i].close > patternHigh) || (patternResult < 0 && bars[i].close < patternLow))
        ) {
            value[i] = patternResult + 100 * (patternResult > 0 ? 1 : -1);
            patternCount = 0;
        }
        near.advance(i - 2);
        if (patternCount > 0) patternCount -= 1;
    }
    return value;
};
