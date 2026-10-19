// packages/indicators/src/formulas/trend_strength/rwi.ts
//
// Random Walk Index (RWI): the formula, ported from pandas-ta's trend/rwi.py.
// Held to its oracle fixture, rwi.json. PURE.

import { nans, ptaAtr, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 14);
    if (period === null || n <= period) return { plus: nulls(n) as DataArray, minus: nulls(n) as DataArray };
    const atr = ptaAtr(bars, period, 'rma');
    const plus = nans(n);
    const minus = nans(n);
    for (let i = period; i < n; i++) {
        const denom = atr[i] * period ** 0.5;
        plus[i] = (bars[i].high - bars[i - period].low) / denom;
        minus[i] = (bars[i - period].high - bars[i].low) / denom;
    }
    return { plus: toOutput(plus), minus: toOutput(minus) };
};
