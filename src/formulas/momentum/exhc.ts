// packages/indicators/src/formulas/momentum/exhc.ts
//
// Exhaustion Count: the formula, ported from pandas-ta's momentum/exhc.py.
// Held to its oracle fixture, exhc.json. PURE.

import { toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 4);
    const cap = intSetting(config.cap, 13, 0);
    if (period === null || cap === null) return { up: nulls(n), down: nulls(n) };
    const x = readSource(bars, config);
    const up = new Array(n).fill(0);
    const down = new Array(n).fill(0);
    for (let i = period; i < n; i++) {
        const d = x[i] - x[i - period];
        if (d > 0) up[i] = up[i - 1] + 1;
        if (d < 0) down[i] = down[i - 1] + 1;
    }
    const capped = (c: number[]) => (cap > 0 ? c.map((v) => Math.min(v, cap)) : c);
    return { up: toOutput(capped(up)), down: toOutput(capped(down)) };
};
