// packages/indicators/src/formulas/moving_averages/t3.ts
//
// T3 Moving Average (Tillson): the formula, ported from TA-Lib's ta_T3.c.
// Held to its oracle fixture, t3.json. PURE.

import { intSetting, nulls, numSetting, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 5);
    const v = numSetting(config.volume_factor, 0.7, 0, 1);
    if (period === null || v === null) return { value };
    const x = readSource(bars, config);
    const lookback = 6 * (period - 1);
    if (n <= lookback) return { value };
    if (period === 1) {
        for (let i = 0; i < n; i++) value[i] = x[i];
        return { value };
    }
    const k = 2.0 / (period + 1.0);
    const oneMinusK = 1.0 - k;
    // Six EMAs in a chain, each seeded with the SMA of the first `period`
    // values of the one before it, as TA-Lib's warmup does.
    const e = [0, 0, 0, 0, 0, 0];
    let today = 0;
    let sum = x[today++];
    for (let i = period - 1; i > 0; i--) sum += x[today++];
    e[0] = sum / period;
    for (let level = 1; level < 6; level++) {
        // This level's seed: the mean of the level below over `period` bars,
        // the first of them being that level's own seed.
        sum = e[level - 1];
        for (let i = period - 1; i > 0; i--) {
            e[0] = oneMinusK * e[0] + k * x[today++];
            for (let j = 1; j < level; j++) e[j] = oneMinusK * e[j] + k * e[j - 1];
            sum += e[level - 1];
        }
        e[level] = sum / period;
    }
    const v2 = v * v;
    const c1 = 0 - v2 * v;
    const c2 = 3.0 * (v2 - c1);
    const c3 = (0 - 6.0) * v2 - 3.0 * (v - c1);
    const c4 = 3.0 * v2 + (3.0 * v + 1.0 - c1);
    value[lookback] = c4 * e[2] + (c3 * e[3] + (c1 * e[5] + c2 * e[4]));
    for (let i = today; i < n; i++) {
        e[0] = oneMinusK * e[0] + k * x[i];
        for (let j = 1; j < 6; j++) e[j] = oneMinusK * e[j] + k * e[j - 1];
        value[i] = c4 * e[2] + (c3 * e[3] + (c1 * e[5] + c2 * e[4]));
    }
    return { value };
};
