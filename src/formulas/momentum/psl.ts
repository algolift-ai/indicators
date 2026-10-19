// packages/indicators/src/formulas/momentum/psl.ts
//
// Psychological Line (PSL): the formula, ported from pandas-ta-classic's momentum/psl.py.
// Held to its oracle fixture, psl.json. PURE.

import { diff, rollingSum, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 12);
    if (period === null) return { value: nulls(bars.length) };
    const rose = diff(readSource(bars, config), 1).map((d) => (d > 0 ? 1 : 0));
    return { value: toOutput(rollingSum(rose, period).map((s) => (100 * s) / period)) };
};
