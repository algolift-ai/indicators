// packages/indicators/src/formulas/moving_averages/ssf.ts
//
// Super Smoother Filter (2-pole): the formula, ported from pandas-ta-classic's overlap/ssf.py.
// Held to its oracle fixture, ssf.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 10);
    if (period === null) return { value: nulls(n) };
    const x = readSource(bars, config);
    const value: DataArray = x.slice();
    const w = (Math.PI * Math.SQRT2) / period;
    const a0 = Math.exp(-w);
    const a1 = -a0 * a0;
    const b1 = 2 * a0 * Math.cos(w);
    const c1 = 1 - a1 - b1;
    for (let i = 2; i < n; i++) value[i] = c1 * x[i] + b1 * (value[i - 1] as number) + a1 * (value[i - 2] as number);
    return { value };
};
