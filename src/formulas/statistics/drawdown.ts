// packages/indicators/src/formulas/statistics/drawdown.ts
//
// Drawdown from High: the formula, ported from pandas-ta-classic's performance/drawdown.py.
// Held to its oracle fixture, drawdown.json. PURE.

import { nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

const finite = (v: number): number | null => (Number.isFinite(v) ? v : null);

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const fraction: DataArray = nulls(n);
    const log: DataArray = nulls(n);
    const x = readSource(bars, config);
    let peak = -Infinity;
    for (let i = 0; i < n; i++) {
        if (x[i] > peak) peak = x[i];
        value[i] = finite(peak - x[i]);
        fraction[i] = finite(1 - x[i] / peak);
        log[i] = finite(Math.log(peak) - Math.log(x[i]));
    }
    return { value, fraction, log };
};
