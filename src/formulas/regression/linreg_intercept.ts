// packages/indicators/src/formulas/regression/linreg_intercept.ts
//
// Linear Regression Intercept: the formula, ported from TA-Lib's ta_LINEARREG_INTERCEPT.c.
// Held to its oracle fixture, linreg_intercept.json. PURE.

import { talibLinregFit, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 14, 2);
    if (period === null) return { value: nulls(bars.length) };
    return { value: toOutput(talibLinregFit(readSource(bars, config), period).b) };
};
