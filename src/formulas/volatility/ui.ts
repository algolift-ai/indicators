// packages/indicators/src/formulas/volatility/ui.ts
//
// Ulcer Index (UI): the formula, ported from pandas-ta-classic's volatility/ui.py.
// Held to its oracle fixture, ui.json. PURE.

import { rollingMax, rollingSum, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 14);
    if (period === null) return { value: nulls(bars.length) };
    const x = readSource(bars, config);
    const highest = rollingMax(x, period);
    const squared = x.map((v, i) => {
        const down = (100 * (v - highest[i])) / highest[i];
        return down * down;
    });
    return { value: toOutput(rollingSum(squared, period).map((s) => Math.sqrt(s / period))) };
};
