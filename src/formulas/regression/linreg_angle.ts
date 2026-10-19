// packages/indicators/src/formulas/regression/linreg_angle.ts
//
// Linear Regression Angle: the formula, ported from TA-Lib's ta_LINEARREG_ANGLE.c.
// Held to its oracle fixture, linreg_angle.json. PURE.

import { talibLinregFit, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 14, 2);
    if (period === null) return { value: nulls(bars.length) };
    const { m } = talibLinregFit(readSource(bars, config), period);
    return { value: toOutput(m.map((s) => Math.atan(s) * (180.0 / 3.141592653589793))) };
};
