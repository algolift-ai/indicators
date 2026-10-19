// packages/indicators/src/formulas/statistics/kurtosis.ts
//
// Kurtosis: the formula, ported from pandas-ta-classic's statistics/kurtosis.py.
// Held to its oracle fixture, kurtosis.json. PURE.

import { powerSum, windowDeviations } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 30, 4);
    if (period === null) return { value };
    const x = readSource(bars, config);
    const k = period;
    // The bias corrections, in the library's order of operations.
    const adj = (3.0 * (k - 1) ** 2) / ((k - 2) * (k - 3));
    for (let i = period - 1; i < n; i++) {
        const dev = windowDeviations(x, i, period);
        const m2 = powerSum(dev, 2);
        const m4 = powerSum(dev, 4);
        const v = (k * (k + 1) * (k - 1) * m4) / ((k - 2) * (k - 3) * (m2 * m2)) - adj;
        value[i] = Number.isFinite(v) ? v : null;
    }
    return { value };
};
