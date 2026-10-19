// packages/indicators/src/formulas/trend_strength/vhf.ts
//
// Vertical Horizontal Filter (VHF): the formula, ported from pandas-ta-classic's trend/vhf.py.
// Held to its oracle fixture, vhf.json. PURE.

import { EPSILON, nans, rollingMax, rollingMin, rollingSum, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 28);
    if (period === null) return { value: nulls(n) as DataArray };
    const x = readSource(bars, config);
    const hcp = rollingMax(x, period);
    const lcp = rollingMin(x, period);
    const change = nans(n);
    for (let i = 1; i < n; i++) change[i] = Math.abs(x[i] - x[i - 1]);
    const moves = rollingSum(change, period);
    // A zero range counts as EPSILON, as the library's non_zero_range makes it; no moves at all leave no value.
    const value = hcp.map((h, i) => {
        const range = h - lcp[i];
        return Math.abs(range !== 0 ? range : EPSILON) / moves[i];
    });
    return { value: toOutput(value) };
};
