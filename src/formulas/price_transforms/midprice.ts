// packages/indicators/src/formulas/price_transforms/midprice.ts
//
// Midpoint Price over Period: the formula, ported from TA-Lib's ta_MIDPRICE.c.
// Held to its oracle fixture, midprice.json. PURE.

import { column, rollingMax, rollingMin, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 14, 2);
    if (period === null) return { value: nulls(bars.length) };
    const hi = rollingMax(column(bars, 'high'), period);
    const lo = rollingMin(column(bars, 'low'), period);
    return { value: toOutput(hi.map((h, i) => (h + lo[i]) / 2.0)) };
};
