// packages/indicators/src/formulas/moving_averages/ssf3.ts
//
// Super Smoother Filter (3-pole): the formula, ported from pandas-ta's overlap/ssf3.py.
// Held to its oracle fixture, ssf3.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Ehlers' truncated constants, as the library's defaults keep them. */
const PI = 3.14159;
const SQRT3 = 1.732;

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 20);
    if (period === null) return { value: nulls(n) };
    const x = readSource(bars, config);
    const value: DataArray = x.slice();
    const a = Math.exp(-PI / period);
    const b = 2 * a * Math.cos((-PI * SQRT3) / period);
    const c = a * a;
    const d4 = c * c;
    const d3 = -c * (1 + b);
    const d2 = b + c;
    const d1 = 1 - d2 - d3 - d4;
    for (let i = 3; i < n; i++) {
        value[i] = d1 * x[i] + d2 * (value[i - 1] as number) + d3 * (value[i - 2] as number) + d4 * (value[i - 3] as number);
    }
    return { value };
};
