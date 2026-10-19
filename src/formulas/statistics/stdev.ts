// packages/indicators/src/formulas/statistics/stdev.ts
//
// Standard Deviation: the formula, ported from TA-Lib's ta_STDDEV.c.
// Held to its oracle fixture, stdev.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';
import { talibWindowVariance } from './variance';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 5, 2);
    const multiplier = config.multiplier === undefined || config.multiplier === '' ? 1.0 : Number(config.multiplier);
    if (period === null || !Number.isFinite(multiplier)) return { value };
    const x = readSource(bars, config);
    for (let i = period - 1; i < n; i++) {
        const sd = Math.sqrt(talibWindowVariance(x, i, period));
        value[i] = multiplier !== 1.0 ? sd * multiplier : sd;
    }
    return { value };
};
