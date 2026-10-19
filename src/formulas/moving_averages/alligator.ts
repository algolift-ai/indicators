// packages/indicators/src/formulas/moving_averages/alligator.ts
//
// Alligator: the formula, ported from pandas-ta's overlap/alligator.py.
// Held to its oracle fixture, alligator.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Wilder's smoothing seeded with the mean of the first `length` values (pandas-ta's `smma`). */
function smma(x: readonly number[], length: number): DataArray {
    const n = x.length;
    const out: DataArray = nulls(n);
    if (length > n) return out;
    let seed = 0;
    for (let k = 0; k < length; k++) seed += x[k];
    let prev = seed / length;
    out[length - 1] = prev;
    for (let i = length; i < n; i++) {
        prev = ((length - 1) * prev + x[i]) / length;
        out[i] = prev;
    }
    return out;
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const jawPeriod = intSetting(config.jaw_period, 13, 2);
    const teethPeriod = intSetting(config.teeth_period, 8, 2);
    const lipsPeriod = intSetting(config.lips_period, 5, 2);
    if (jawPeriod === null || teethPeriod === null || lipsPeriod === null) return { jaw: nulls(n), teeth: nulls(n), lips: nulls(n) };
    const x = readSource(bars, config);
    return { jaw: smma(x, jawPeriod), teeth: smma(x, teethPeriod), lips: smma(x, lipsPeriod) };
};
