// packages/indicators/src/formulas/regression/tsf.ts
//
// Time Series Forecast: the formula, ported from TA-Lib's ta_TSF.c.
// Held to its oracle fixture, tsf.json. PURE.

import { talibLinregFit, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 14, 2);
    if (period === null) return { value: nulls(bars.length) };
    const { m, b } = talibLinregFit(readSource(bars, config), period);
    return { value: toOutput(m.map((s, i) => s * period + b[i])) };
};
