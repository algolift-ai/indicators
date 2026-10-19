// packages/indicators/src/formulas/momentum/bias.ts
//
// Bias: the formula, ported from pandas-ta-classic's momentum/bias.py.
// Held to its oracle fixture, bias.json. PURE.

import { rollingMean, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 26);
    if (period === null) return { value: nulls(bars.length) };
    const x = readSource(bars, config);
    const ma = rollingMean(x, period);
    return { value: toOutput(x.map((v, i) => v / ma[i] - 1)) };
};
