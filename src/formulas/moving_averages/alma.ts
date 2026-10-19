// packages/indicators/src/formulas/moving_averages/alma.ts
//
// Arnaud Legoux Moving Average (ALMA): the formula, ported from pandas-ta's overlap/alma.py.
// Held to its oracle fixture, alma.json. PURE.

import { rollingDot, toOutput } from '../../core/libmath';
import { intSetting, nulls, numSetting, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 9);
    const sigma = numSetting(config.sigma, 6, 0, Infinity, { openMin: true });
    const offset = numSetting(config.distribution_offset, 0.85, 0, 1);
    if (period === null || sigma === null || offset === null) return { value };
    const k = Math.floor(offset * (period - 1));
    const weights: number[] = [];
    let total = 0;
    for (let i = 0; i < period; i++) {
        const w = Math.exp(-0.5 * ((sigma / period) * (i - k)) ** 2);
        weights.push(w);
        total += w;
    }
    for (let i = 0; i < period; i++) weights[i] /= total;
    return { value: toOutput(rollingDot(readSource(bars, config), weights)) };
};
