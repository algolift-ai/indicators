// packages/indicators/src/formulas/moving_averages/fwma.ts
//
// Fibonacci Weighted Moving Average (FWMA): the formula, ported from pandas-ta-classic's overlap/fwma.py.
// Held to its oracle fixture, fwma.json. PURE.

import { rollingDot, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 10);
    if (period === null) return { value: nulls(bars.length) };
    // 1, 1, 2, 3, 5, ... (period numbers), oldest bar first, over their sum.
    const fibs: number[] = [1];
    let a = 1;
    let b = 1;
    for (let k = 1; k < period; k++) {
        const next = a + b;
        a = b;
        b = next;
        fibs.push(a);
    }
    let total = 0;
    for (const f of fibs) total += f;
    return { value: toOutput(rollingDot(readSource(bars, config), fibs.map((f) => f / total))) };
};
