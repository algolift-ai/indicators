// packages/indicators/src/formulas/momentum/slope.ts
//
// Slope: the formula, ported from pandas-ta-classic's momentum/slope.py.
// Held to its oracle fixture, slope.json. PURE.

import { diff, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 1);
    if (period === null) return { value: nulls(bars.length) };
    return { value: toOutput(diff(readSource(bars, config), period).map((d) => d / period)) };
};
