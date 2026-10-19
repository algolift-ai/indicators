// packages/indicators/src/formulas/statistics/quantile.ts
//
// Rolling Quantile: the formula, ported from pandas-ta-classic's statistics/quantile.py.
// Held to its oracle fixture, quantile.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 30);
    const q = config.q === undefined || config.q === '' ? 0.5 : Number(config.q);
    if (period === null || !(q > 0 && q < 1)) return { value };
    const x = readSource(bars, config);
    // NumPy's 'linear' method: the virtual index (n - 1) q, its floor and
    // the next, and a lerp written from whichever end is nearer.
    const virtual = (period - 1) * q;
    const above = virtual >= period - 1;
    const prev = above ? period - 1 : Math.floor(virtual);
    const next = above ? period - 1 : prev + 1;
    const gamma = virtual - (above ? -1 : prev);
    for (let i = period - 1; i < n; i++) {
        const w = Float64Array.from(x.slice(i - period + 1, i + 1)).sort();
        const a = w[prev];
        const b = w[next];
        const diff = b - a;
        value[i] = gamma >= 0.5 ? b - diff * (1 - gamma) : a + diff * gamma;
    }
    return { value };
};
