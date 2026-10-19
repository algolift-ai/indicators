// packages/indicators/src/formulas/trend_strength/decay.ts
//
// Decay (linear or exponential): the formula, ported from pandas-ta-classic's trend/decay.py.
// Held to its oracle fixture, decay.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 5);
    if (period === null || n === 0) return { value };
    const x = readSource(bars, config);
    if (config.mode === 'multiplicative') {
        // edecay: the line itself fades, never below today's value (no floor at 0 here).
        const factor = Math.exp(-1.0 / period);
        let prev = x[0];
        value[0] = prev;
        for (let i = 1; i < n; i++) {
            prev = Math.max(x[i], prev * factor);
            value[i] = prev;
        }
        return { value };
    }
    const step = config.mode === 'exp' ? Math.exp(-period) : 1 / period;
    value[0] = Math.max(x[0], 0);
    for (let i = 1; i < n; i++) value[i] = Math.max(x[i], x[i - 1] - step, 0);
    return { value };
};
