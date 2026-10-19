// packages/indicators/src/formulas/moving_averages/trima.ts
//
// Triangular Moving Average (TRIMA): the formula, ported from TA-Lib's ta_TRIMA.c.
// Held to its oracle fixture, trima.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 30);
    if (period === null) return { value };
    const x = readSource(bars, config);
    // Weights 1, 2, ..., up to the middle and back down: (1,2,2,1) for 4,
    // (1,2,3,2,1) for 5. That is TA-Lib's SMA(SMA(x, a), b) with
    // a = b = (n + 1) / 2 for an odd n and a = n / 2, b = n / 2 + 1 for an even n.
    const weights: number[] = [];
    let divider = 0;
    for (let k = 0; k < period; k++) {
        const w = Math.min(k + 1, period - k);
        weights.push(w);
        divider += w;
    }
    for (let i = period - 1; i < n; i++) {
        let sum = 0;
        for (let k = 0; k < period; k++) sum += x[i - period + 1 + k] * weights[k];
        value[i] = sum / divider;
    }
    return { value };
};
