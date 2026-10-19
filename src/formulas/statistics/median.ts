// packages/indicators/src/formulas/statistics/median.ts
//
// Rolling Median: the formula, ported from pandas-ta-classic's statistics/median.py.
// Held to its oracle fixture, median.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 30);
    if (period === null) return { value };
    const x = readSource(bars, config);
    const mid = Math.floor(period / 2);
    for (let i = period - 1; i < n; i++) {
        const w = Float64Array.from(x.slice(i - period + 1, i + 1)).sort();
        value[i] = period % 2 === 1 ? w[mid] : (w[mid - 1] + w[mid]) / 2;
    }
    return { value };
};
