// packages/indicators/src/formulas/volatility/accbands.ts
//
// Acceleration Bands: the formula, ported from pandas-ta-classic's volatility/accbands.py.
// Held to its oracle fixture, accbands.json. PURE.

import { column, nonZeroRange, rollingMean, toOutput } from '../../core/libmath';
import { intSetting, nulls, numSetting } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 20);
    const c = numSetting(config.multiplier, 4, 0, Infinity, { openMin: true });
    if (period === null || c === null) return { lower: nulls(n), middle: nulls(n), upper: nulls(n) };
    const high = column(bars, 'high');
    const low = column(bars, 'low');
    const range = nonZeroRange(high, low);
    const ratio = range.map((r, i) => (r / (high[i] + low[i])) * c);
    return {
        lower: toOutput(rollingMean(low.map((l, i) => l * (1 - ratio[i])), period)),
        middle: toOutput(rollingMean(column(bars, 'close'), period)),
        upper: toOutput(rollingMean(high.map((h, i) => h * (1 + ratio[i])), period)),
    };
};
