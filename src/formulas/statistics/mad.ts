// packages/indicators/src/formulas/statistics/mad.ts
//
// Mean Absolute Deviation (MAD): the formula, ported from pandas-ta-classic's statistics/mad.py.
// Held to its oracle fixture, mad.json. PURE.

import { npSum, windowDeviations } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 30);
    if (period === null) return { value };
    const x = readSource(bars, config);
    for (let i = period - 1; i < n; i++) {
        const dev = windowDeviations(x, i, period);
        for (let k = 0; k < period; k++) dev[k] = Math.abs(dev[k]);
        value[i] = npSum(dev, 0, period) / period;
    }
    return { value };
};
