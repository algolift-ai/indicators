// packages/indicators/src/formulas/volume/wad.ts
//
// Williams Accumulation/Distribution (WAD): the formula, ported from pandas-ta-classic's volume/wad.py.
// Held to its oracle fixture, wad.json. PURE.

import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars) => {
    const value: DataArray = [];
    let total = 0;
    for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        if (i > 0) {
            const prev = bars[i - 1].close;
            if (b.close > prev) total += b.close - Math.min(b.low, prev);
            else if (b.close < prev) total += b.close - Math.max(b.high, prev);
        }
        value.push(total);
    }
    return { value };
};
