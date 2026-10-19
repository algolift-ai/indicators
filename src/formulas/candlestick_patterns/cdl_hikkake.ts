// packages/indicators/src/formulas/candlestick_patterns/cdl_hikkake.ts
//
// Hikkake Pattern: the formula, ported from TA-Lib's ta_CDLHIKKAKE.c.
// Held to its oracle fixture, cdl_hikkake.json. PURE.

import { patternFrame } from '../../core/candles';
import type { PatternFormula, SpecBar } from '../../types';

/** An inside bar (i - 1 inside i - 2) followed by a bar breaking out of it on both ends the same way. */
function isHikkake(bars: SpecBar[], i: number): boolean {
    return (
        bars[i - 1].high < bars[i - 2].high &&
        bars[i - 1].low > bars[i - 2].low &&
        ((bars[i].high < bars[i - 1].high && bars[i].low < bars[i - 1].low) || (bars[i].high > bars[i - 1].high && bars[i].low > bars[i - 1].low))
    );
}

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const n = bars.length;
    const { value, start } = patternFrame(n, 5);
    if (start >= n) return value;
    let patternResult = 0;
    let savedHigh = 0.0;
    let savedLow = 0.0;
    let cd = 0;
    // The C's warm-up: the three bars before startIdx set the state, writing nothing.
    for (let i = start - 3; i < start; i++) {
        if (isHikkake(bars, i)) {
            patternResult = 100 * (bars[i].high < bars[i - 1].high ? 1 : -1);
            savedHigh = bars[i - 1].high;
            savedLow = bars[i - 1].low;
            cd = 4;
        } else if (cd > 0 && ((patternResult > 0 && bars[i].close > savedHigh) || (patternResult < 0 && bars[i].close < savedLow))) {
            cd = 0;
        }
        if (cd > 0) cd -= 1;
    }
    for (let i = start; i < n; i++) {
        if (isHikkake(bars, i)) {
            patternResult = 100 * (bars[i].high < bars[i - 1].high ? 1 : -1);
            savedHigh = bars[i - 1].high;
            savedLow = bars[i - 1].low;
            cd = 4;
            value[i] = patternResult;
        } else if (cd > 0 && ((patternResult > 0 && bars[i].close > savedHigh) || (patternResult < 0 && bars[i].close < savedLow))) {
            value[i] = patternResult + 100 * (patternResult > 0 ? 1 : -1);
            cd = 0;
        }
        if (cd > 0) cd -= 1;
    }
    return value;
};
