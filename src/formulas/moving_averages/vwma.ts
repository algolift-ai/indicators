// packages/indicators/src/formulas/moving_averages/vwma.ts
//
// Volume Weighted Moving Average (VWMA): the formula, ported from pandas-ta-classic's overlap/vwma.py.
// Held to its oracle fixture, vwma.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 10);
    if (period === null) return { value };
    const x = readSource(bars, config);
    for (let i = period - 1; i < n; i++) {
        let pv = 0;
        let vol = 0;
        for (let k = i - period + 1; k <= i; k++) {
            pv += x[k] * bars[k].volume;
            vol += bars[k].volume;
        }
        const ratio = pv / period / (vol / period);
        value[i] = Number.isFinite(ratio) ? ratio : null;
    }
    return { value };
};
