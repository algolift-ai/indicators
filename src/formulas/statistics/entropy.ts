// packages/indicators/src/formulas/statistics/entropy.ts
//
// Entropy: the formula, ported from pandas-ta-classic's statistics/entropy.py.
// Held to its oracle fixture, entropy.json. PURE.

import { npSum } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 10);
    const base = config.base === undefined || config.base === '' ? 2.0 : Number(config.base);
    if (period === null || !(base > 0) || base === 1) return { value };
    const x = readSource(bars, config);
    const logBase = Math.log(base);
    const terms = new Float64Array(period);
    for (let i = period - 1; i < n; i++) {
        const start = i - period + 1;
        const sum = npSum(x, start, start + period);
        if (sum === 0) continue;
        for (let k = 0; k < period; k++) {
            const p = x[start + k] / sum;
            // A share of 0 or below has no log: it adds nothing (NumPy's nansum).
            const t = (-p * Math.log(p)) / logBase;
            terms[k] = Number.isNaN(t) ? 0 : t;
        }
        const v = npSum(terms, 0, period);
        value[i] = Number.isFinite(v) ? v : null;
    }
    return { value };
};
