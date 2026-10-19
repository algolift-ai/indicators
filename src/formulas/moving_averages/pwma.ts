// packages/indicators/src/formulas/moving_averages/pwma.ts
//
// Pascal's Weighted Moving Average (PWMA): the formula, ported from pandas-ta-classic's overlap/pwma.py.
// Held to its oracle fixture, pwma.json. PURE.

import { rollingDot, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 10);
    if (period === null) return { value: nulls(bars.length) };
    // C(m, k) / 2^m for m = period - 1: the row's sum is exactly 2^m.
    const m = period - 1;
    const scale = 2 ** m;
    const weights: number[] = [];
    let c = 1;
    for (let k = 0; k <= m; k++) {
        weights.push(c / scale);
        c = (c * (m - k)) / (k + 1);
    }
    return { value: toOutput(rollingDot(readSource(bars, config), weights)) };
};
