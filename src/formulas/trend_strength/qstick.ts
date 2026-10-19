// packages/indicators/src/formulas/trend_strength/qstick.ts
//
// QStick: the formula, ported from pandas-ta-classic's trend/qstick.py.
// Held to its oracle fixture, qstick.json. PURE.

import { EPSILON, rollingMean, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 10);
    if (period === null) return { value: nulls(n) as DataArray };
    // A body of exactly 0 counts as EPSILON, as the library's non_zero_range makes it.
    const body = bars.map((b) => {
        const d = b.close - b.open;
        return d !== 0 ? d : EPSILON;
    });
    return { value: toOutput(rollingMean(body, period)) };
};
