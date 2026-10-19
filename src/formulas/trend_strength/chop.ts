// packages/indicators/src/formulas/trend_strength/chop.ts
//
// Choppiness Index (CHOP): the formula, ported from pandas-ta-classic's trend/chop.py.
// Held to its oracle fixture, chop.json. PURE.

import { ptacAtr, rollingMax, rollingMin, rollingSum, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 14, 2);
    const atrPeriod = intSetting(config.atr_period, 1);
    if (period === null || atrPeriod === null) return { value };
    const hh = rollingMax(bars.map((b) => b.high), period);
    const ll = rollingMin(bars.map((b) => b.low), period);
    const atrSum = rollingSum(ptacAtr(bars, atrPeriod, 'rma'), period);
    const logN = Math.log10(period);
    return { value: toOutput(atrSum.map((s, i) => (100 * (Math.log10(s) - Math.log10(hh[i] - ll[i]))) / logN)) };
};
