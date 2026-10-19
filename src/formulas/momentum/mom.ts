// packages/indicators/src/formulas/momentum/mom.ts
//
// Momentum: the formula, ported from TA-Lib's ta_MOM.c.
// Held to its oracle fixture, mom.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 10);
    if (period === null) return { value };
    const x = readSource(bars, config);
    for (let i = period; i < n; i++) value[i] = x[i] - x[i - period];
    return { value };
};
