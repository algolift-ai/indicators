// packages/indicators/src/formulas/volume/pvol.ts
//
// Price-Volume (PVOL): the formula, ported from pandas-ta-classic's volume/pvol.py.
// Held to its oracle fixture, pvol.json. PURE.

import { signedSeries } from '../../core/libmath';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const value: DataArray = bars.map((b) => b.close * b.volume);
    if (config.signed === 'yes') {
        const sign = signedSeries(bars.map((b) => b.close));
        for (let i = 0; i < value.length; i++) value[i] = (value[i] as number) * sign[i];
    }
    return { value };
};
