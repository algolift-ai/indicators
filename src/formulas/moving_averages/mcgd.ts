// packages/indicators/src/formulas/moving_averages/mcgd.ts
//
// McGinley Dynamic: the formula, ported from pandas-ta-classic's overlap/mcgd.py.
// Held to its oracle fixture, mcgd.json. PURE.

import { intSetting, nulls, numSetting, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 10);
    const c = numSetting(config.constant, 1, 0, 1, { openMin: true });
    if (period === null || c === null || n === 0) return { value };
    const x = readSource(bars, config);
    let prev = x[0];
    value[0] = prev;
    for (let i = 1; i < n; i++) {
        if (prev !== 0) {
            let denom = c * period * (x[i] / prev) ** 4;
            if (denom < 1e-10) denom = 1e-10;
            prev = prev + (x[i] - prev) / denom;
        } else {
            prev = x[i];
        }
        value[i] = prev;
    }
    return { value };
};
