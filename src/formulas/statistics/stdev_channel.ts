// packages/indicators/src/formulas/statistics/stdev_channel.ts
//
// Standard Deviation Channel (all bars): the formula, ported from pandas-ta-classic's statistics/tos_stdevall.py.
// Held to its oracle fixture, stdev_channel.json. PURE.

import { windowVariance } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** The bands' widths in standard deviations (the library's default list). */
export const WIDTHS = [1, 2, 3] as const;

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const out: Record<string, DataArray> = { middle: nulls(n) };
    for (const w of WIDTHS) {
        out[`upper_${w}`] = nulls(n);
        out[`lower_${w}`] = nulls(n);
    }
    const period = intSetting(config.period, 0, 0);
    if (period === null || period === 1 || period === 2) return out;
    const length = period === 0 ? n : period;
    if (length < 2 || length > n) return out;
    const start = n - length;
    const y = readSource(bars, config);
    // Least squares on the bar index, centred for precision.
    const xm = (start + n - 1) / 2;
    let ym = 0;
    for (let j = start; j < n; j++) ym += y[j];
    ym /= length;
    let sxx = 0;
    let sxy = 0;
    for (let j = start; j < n; j++) {
        sxx += (j - xm) * (j - xm);
        sxy += (j - xm) * (y[j] - ym);
    }
    const slope = sxy / sxx;
    const intercept = ym - slope * xm;
    const sd = Math.sqrt(windowVariance(y, n - 1, length, 1));
    for (let j = start; j < n; j++) {
        const lr = slope * j + intercept;
        out.middle[j] = lr;
        for (const w of WIDTHS) {
            out[`upper_${w}`][j] = lr + w * sd;
            out[`lower_${w}`][j] = lr - w * sd;
        }
    }
    return out;
};
