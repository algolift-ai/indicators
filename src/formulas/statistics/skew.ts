// packages/indicators/src/formulas/statistics/skew.ts
//
// Skewness: the formula, ported from pandas-ta-classic's statistics/skew.py.
// Held to its oracle fixture, skew.json. PURE.

import { powerSum, windowDeviations } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 30, 3);
    if (period === null) return { value };
    const x = readSource(bars, config);
    const k = period;
    for (let i = period - 1; i < n; i++) {
        const dev = windowDeviations(x, i, period);
        const m2 = powerSum(dev, 2);
        const m3 = powerSum(dev, 3);
        const v = (((k * Math.sqrt(k - 1)) / (k - 2)) * m3) / m2 ** 1.5;
        value[i] = Number.isFinite(v) ? v : null;
    }
    return { value };
};
