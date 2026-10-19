// packages/indicators/src/formulas/volatility/chandelier.ts
//
// Chandelier Exit: the formula, ported from pandas-ta-classic's volatility/ce.py.
// Held to its oracle fixture, chandelier.json. PURE.

import { column, ptacAtr, rollingMax, rollingMin, toOutput } from '../../core/libmath';
import { intSetting, nulls, numSetting } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 22);
    const multiplier = numSetting(config.multiplier, 3, 0, Infinity, { openMin: true });
    if (period === null || multiplier === null) return { long: nulls(n), short: nulls(n) };
    const atr = ptacAtr(bars, period);
    const highest = rollingMax(column(bars, 'high'), period);
    const lowest = rollingMin(column(bars, 'low'), period);
    return {
        long: toOutput(highest.map((h, i) => h - atr[i] * multiplier)),
        short: toOutput(lowest.map((l, i) => l + atr[i] * multiplier)),
    };
};
