// packages/indicators/src/formulas/momentum/bop.ts
//
// Balance of Power (BOP): the formula, ported from TA-Lib's ta_BOP.c.
// Held to its oracle fixture, bop.json. PURE.

import { nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars) => {
    const value: DataArray = nulls(bars.length);
    for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        const range = b.high - b.low;
        value[i] = range <= 0.0 ? 0.0 : (b.close - b.open) / range;
    }
    return { value };
};
