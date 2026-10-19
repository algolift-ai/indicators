// packages/indicators/src/formulas/moving_averages/swma.ts
//
// Symmetric Weighted Moving Average (SWMA): the formula, ported from pandas-ta-classic's overlap/swma.py.
// Held to its oracle fixture, swma.json. PURE.

import { rollingDot, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 10);
    if (period === null) return { value: nulls(bars.length) };
    // 1, 2, ..., up to the middle and back: (1, 2, 2, 1) for 4, (1, 2, 3, 2, 1) for 5.
    const weights: number[] = [];
    let total = 0;
    for (let k = 0; k < period; k++) {
        const w = Math.min(k + 1, period - k);
        weights.push(w);
        total += w;
    }
    return { value: toOutput(rollingDot(readSource(bars, config), weights.map((w) => w / total))) };
};
