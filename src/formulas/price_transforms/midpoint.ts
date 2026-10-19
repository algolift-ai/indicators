// packages/indicators/src/formulas/price_transforms/midpoint.ts
//
// Midpoint over Period: the formula, ported from TA-Lib's ta_MIDPOINT.c.
// Held to its oracle fixture, midpoint.json. PURE.

import { rollingMax, rollingMin, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 14, 2);
    if (period === null) return { value: nulls(bars.length) };
    const x = readSource(bars, config);
    const hi = rollingMax(x, period);
    const lo = rollingMin(x, period);
    return { value: toOutput(hi.map((h, i) => (h + lo[i]) / 2.0)) };
};
