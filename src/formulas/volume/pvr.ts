// packages/indicators/src/formulas/volume/pvr.ts
//
// Price Volume Rank (PVR): the formula, ported from pandas-ta-classic's volume/pvr.py.
// Held to its oracle fixture, pvr.json. PURE.

import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars) => {
    const value: DataArray = bars.map((b, i) => {
        const priceUp = i === 0 || b.close - bars[i - 1].close >= 0;
        const volumeUp = i === 0 || b.volume - bars[i - 1].volume >= 0;
        return priceUp ? (volumeUp ? 1 : 2) : volumeUp ? 3 : 4;
    });
    return { value };
};
