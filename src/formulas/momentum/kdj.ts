// packages/indicators/src/formulas/momentum/kdj.ts
//
// KDJ: the formula, ported from pandas-ta-classic's momentum/kdj.py.
// Held to its oracle fixture, kdj.json. PURE.

import { column, nonZeroRange, ptacRma, rollingMax, rollingMin, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 9);
    const signal = intSetting(config.signal, 3);
    if (period === null || signal === null) return { k: nulls(n), d: nulls(n), j: nulls(n) };
    const hh = rollingMax(column(bars, 'high'), period);
    const ll = rollingMin(column(bars, 'low'), period);
    const range = nonZeroRange(hh, ll);
    const fastK = bars.map((b, i) => (100 * (b.close - ll[i])) / range[i]);
    const k = ptacRma(fastK, signal);
    const d = ptacRma(k, signal);
    return { k: toOutput(k), d: toOutput(d), j: toOutput(k.map((v, i) => 3 * v - 2 * d[i])) };
};
