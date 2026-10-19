// packages/indicators/src/formulas/statistics/zscore.ts
//
// Z-Score: the formula, ported from pandas-ta-classic's statistics/zscore.py.
// Held to its oracle fixture, zscore.json. PURE.

import { powerSum, windowDeviations } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 30, 2);
    if (period === null) return { value };
    const x = readSource(bars, config);
    for (let i = period - 1; i < n; i++) {
        const dev = windowDeviations(x, i, period);
        const sd = Math.sqrt(powerSum(dev, 2) / (period - 1));
        // The value's own deviation is the window's last.
        const v = dev[period - 1] / sd;
        value[i] = Number.isFinite(v) ? v : null;
    }
    return { value };
};
