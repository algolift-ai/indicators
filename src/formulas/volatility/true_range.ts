// packages/indicators/src/formulas/volatility/true_range.ts
//
// True Range: the formula, ported from TA-Lib's ta_TRANGE.c.
// Held to its oracle fixture, true_range.json. PURE.

import { nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    // In TA-Lib's order of comparison, from bar 1 (bar 0 has no previous close).
    for (let i = 1; i < n; i++) {
        const prevClose = bars[i - 1].close;
        let greatest = bars[i].high - bars[i].low;
        const toHigh = Math.abs(prevClose - bars[i].high);
        if (toHigh > greatest) greatest = toHigh;
        const toLow = Math.abs(bars[i].low - prevClose);
        if (toLow > greatest) greatest = toLow;
        value[i] = greatest;
    }
    return { value };
};
