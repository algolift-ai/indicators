// packages/indicators/src/formulas/volume/pvt.ts
//
// Price Volume Trend (PVT): the formula, ported from pandas-ta-classic's volume/pvt.py.
// Held to its oracle fixture, pvt.json. PURE.

import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars) => {
    const value: DataArray = bars.length ? [null] : [];
    let total = 0;
    for (let i = 1; i < bars.length; i++) {
        const then = bars[i - 1].close;
        total += ((100 * (bars[i].close - then)) / then) * bars[i].volume;
        value.push(total);
    }
    return { value };
};
