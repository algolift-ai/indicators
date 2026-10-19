// packages/indicators/src/formulas/trend_strength/dpo.ts
//
// Detrended Price Oscillator (DPO): the formula, ported from pandas-ta-classic's trend/dpo.py.
// Held to its oracle fixture, dpo.json. PURE.

import { rollingMean } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 20);
    if (period === null) return { value };
    const t = Math.floor(0.5 * period) + 1;
    const x = readSource(bars, config);
    const ma = rollingMean(x, period);
    if (config.centering === 'trailing') {
        for (let i = period - 1 + t; i < n; i++) value[i] = x[i] - ma[i - t];
    } else {
        for (let i = Math.max(0, period - 1 - t); i + t < n; i++) value[i] = x[i] - ma[i + t];
    }
    return { value };
};
