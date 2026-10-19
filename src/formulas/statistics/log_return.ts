// packages/indicators/src/formulas/statistics/log_return.ts
//
// Log Return: the formula, ported from pandas-ta-classic's performance/log_return.py.
// Held to its oracle fixture, log_return.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 1);
    if (period === null) return { value };
    const x = readSource(bars, config);
    const cumulative = config.mode === 'cumulative';
    for (let i = cumulative ? 0 : period; i < n; i++) {
        const v = Math.log(x[i] / x[cumulative ? 0 : i - period]);
        value[i] = Number.isFinite(v) ? v : null;
    }
    return { value };
};
