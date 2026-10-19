// packages/indicators/src/formulas/momentum/cti.ts
//
// Correlation Trend Indicator (CTI): the formula, ported from pandas-ta-classic's momentum/cti.py.
// Held to its oracle fixture, cti.json. PURE.

import { ptacLinreg, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 12, 2);
    if (period === null) return { value: nulls(bars.length) };
    return { value: toOutput(ptacLinreg(readSource(bars, config), period, 'r')) };
};
