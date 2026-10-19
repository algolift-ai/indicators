// packages/indicators/src/formulas/volume/marketfi.ts
//
// Market Facilitation Index: the formula, ported from pandas-ta-classic's volume/marketfi.py.
// Held to its oracle fixture, marketfi.json. PURE.

import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars) => {
    const value: DataArray = bars.map((b) => {
        const diff = b.high - b.low;
        const v = (diff !== 0 ? diff : Number.EPSILON) / b.volume;
        return Number.isFinite(v) ? v : null;
    });
    return { value };
};
