// packages/indicators/src/formulas/moving_averages/wma.ts
//
// Weighted Moving Average (WMA): the formula, ported from TA-Lib's ta_WMA.c.
// Held to its oracle fixture, wma.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 30);
    if (period === null) return { value };
    const x = readSource(bars, config);
    const divider = (period * (period + 1)) / 2;
    for (let i = period - 1; i < n; i++) {
        let sum = 0;
        for (let k = 0; k < period; k++) sum += x[i - period + 1 + k] * (k + 1);
        value[i] = sum / divider;
    }
    return { value };
};
