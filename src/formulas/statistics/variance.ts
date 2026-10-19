// packages/indicators/src/formulas/statistics/variance.ts
//
// Variance: the formula, ported from TA-Lib's ta_VAR.c.
// Held to its oracle fixture, variance.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/**
 * The population variance of the `period` values ending at `end`, as TA-Lib's
 * VAR computes it when it reseeds: shift by the window's mean, then the mean
 * square less the squared mean, 0 when that is under 1e-12 of the mean square.
 */
export function talibWindowVariance(x: readonly number[], end: number, period: number): number {
    const invPeriod = 1.0 / period;
    const start = end - period + 1;
    let total = 0.0;
    for (let j = start; j <= end; j++) total += x[j];
    const shift = total * invPeriod;
    let periodTotal1 = 0.0;
    let periodTotal2 = 0.0;
    for (let j = start; j <= end; j++) {
        const d = x[j] - shift;
        periodTotal1 += d;
        periodTotal2 += d * d;
    }
    const meanValue1 = periodTotal1 * invPeriod;
    const variance = periodTotal2 * invPeriod - meanValue1 * meanValue1;
    return variance < 0.000000000001 * (periodTotal2 * invPeriod) ? 0.0 : variance;
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 5);
    if (period === null) return { value };
    const x = readSource(bars, config);
    for (let i = period - 1; i < n; i++) value[i] = talibWindowVariance(x, i, period);
    return { value };
};
