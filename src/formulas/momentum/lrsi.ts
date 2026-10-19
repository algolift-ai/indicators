// packages/indicators/src/formulas/momentum/lrsi.ts
//
// Laguerre RSI: the formula, ported from pandas-ta-classic's momentum/lrsi.py.
// Held to its oracle fixture, lrsi.json. PURE.

import { nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const gamma = config.gamma === undefined || config.gamma === '' ? 0.5 : Number(config.gamma);
    if (!(gamma > 0 && gamma < 1) || n === 0) return { value: nulls(n) };
    const x = readSource(bars, config);
    const value = nulls(n);
    let l0 = x[0];
    let l1 = x[0];
    let l2 = x[0];
    let l3 = x[0];
    for (let i = 0; i < n; i++) {
        if (i > 0) {
            const p0 = l0;
            const p1 = l1;
            const p2 = l2;
            l0 = (1 - gamma) * x[i] + gamma * p0;
            l1 = -gamma * l0 + p0 + gamma * p1;
            l2 = -gamma * l1 + p1 + gamma * p2;
            l3 = -gamma * l2 + p2 + gamma * l3;
        }
        const up = 0 + Math.max(l0 - l1, 0) + Math.max(l1 - l2, 0) + Math.max(l2 - l3, 0);
        const down = 0 + Math.max(l1 - l0, 0) + Math.max(l2 - l1, 0) + Math.max(l3 - l2, 0);
        const total = up + down;
        value[i] = (100 * up) / (total === 0 ? 1 : total);
    }
    return { value };
};
