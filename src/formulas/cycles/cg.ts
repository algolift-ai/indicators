// packages/indicators/src/formulas/cycles/cg.ts
//
// Center of Gravity (Ehlers): the formula, ported from pandas-ta-classic's momentum/cg.py.
// Held to its oracle fixture, cg.json. PURE.

import { rollingDot, rollingSum, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 10);
    if (period === null) return { value: nulls(n) };
    const x = readSource(bars, config);
    // Oldest bar weighted by the period, the newest by 1.
    const weights = Array.from({ length: period }, (_, i) => period - i);
    const numerator = rollingDot(x, weights);
    const total = rollingSum(x, period);
    return { value: toOutput(numerator.map((v, i) => -v / total[i])) };
};
