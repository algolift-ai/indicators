// packages/indicators/src/formulas/moving_averages/sinwma.ts
//
// Sine Weighted Moving Average (SINWMA): the formula, ported from pandas-ta-classic's overlap/sinwma.py.
// Held to its oracle fixture, sinwma.json. PURE.

import { rollingDot, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 14);
    if (period === null) return { value: nulls(bars.length) };
    const sines: number[] = [];
    let total = 0;
    for (let i = 0; i < period; i++) {
        const s = Math.sin(((i + 1) * Math.PI) / (period + 1));
        sines.push(s);
        total += s;
    }
    return { value: toOutput(rollingDot(readSource(bars, config), sines.map((s) => s / total))) };
};
