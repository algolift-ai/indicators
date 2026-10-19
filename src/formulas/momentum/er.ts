// packages/indicators/src/formulas/momentum/er.ts
//
// Efficiency Ratio (ER): the formula, ported from pandas-ta-classic's momentum/er.py.
// Held to its oracle fixture, er.json. PURE.

import { diff, rollingSum, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 10);
    if (period === null) return { value: nulls(bars.length) };
    const x = readSource(bars, config);
    const net = diff(x, period).map(Math.abs);
    const path = rollingSum(diff(x, 1).map(Math.abs), period);
    return { value: toOutput(net.map((v, i) => v / path[i])) };
};
