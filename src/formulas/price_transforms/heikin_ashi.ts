// packages/indicators/src/formulas/price_transforms/heikin_ashi.ts
//
// Heikin-Ashi Candles: the formula, ported from pandas-ta-classic's candles/ha.py.
// Held to its oracle fixture, heikin_ashi.json. PURE.

import { nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars) => {
    const n = bars.length;
    const open: DataArray = nulls(n);
    const high: DataArray = nulls(n);
    const low: DataArray = nulls(n);
    const close: DataArray = nulls(n);
    if (n === 0) return { open, high, low, close };
    let haOpen = 0.5 * (bars[0].open + bars[0].close);
    let haClose = 0;
    for (let i = 0; i < n; i++) {
        const b = bars[i];
        if (i > 0) haOpen = 0.5 * (haOpen + haClose);
        haClose = 0.25 * (b.open + b.high + b.low + b.close);
        open[i] = haOpen;
        close[i] = haClose;
        high[i] = Math.max(haOpen, b.high, haClose);
        low[i] = Math.min(haOpen, b.low, haClose);
    }
    return { open, high, low, close };
};
