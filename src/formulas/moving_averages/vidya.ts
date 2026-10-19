// packages/indicators/src/formulas/moving_averages/vidya.ts
//
// Variable Index Dynamic Average (VIDYA): the formula, ported from pandas-ta-classic's overlap/vidya.py.
// Held to its oracle fixture, vidya.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 14);
    if (period === null || period > n) return { value };
    const x = readSource(bars, config);
    const alpha = 2 / (period + 1);
    // |CMO| over the last `period` one-bar changes, null before a full
    // window. A window with no change at all reads 0, not the library's
    // 0 / 0 NaN, so the line holds instead of going blank for good.
    const absCmo = (i: number): number | null => {
        if (i < period) return null;
        let pos = 0;
        let neg = 0;
        for (let k = i - period + 1; k <= i; k++) {
            const d = x[k] - x[k - 1];
            if (d > 0) pos += d;
            else neg += -d;
        }
        const den = pos + neg;
        return den === 0 ? 0 : Math.abs((pos - neg) / den);
    };
    let seed = 0;
    for (let k = 0; k < period; k++) seed += x[k];
    let prev = seed / period;
    value[period - 1] = prev;
    for (let i = period; i < n; i++) {
        const c = absCmo(i) as number;
        prev = alpha * c * x[i] + prev * (1 - alpha * c);
        value[i] = prev;
    }
    return { value };
};
