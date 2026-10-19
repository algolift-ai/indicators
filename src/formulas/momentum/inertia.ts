// packages/indicators/src/formulas/momentum/inertia.ts
//
// Inertia: the formula, ported from pandas-ta-classic's momentum/inertia.py.
// Held to its oracle fixture, inertia.json. PURE.

import { diff, ptacEma, ptacLinreg, rollingVar, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 20, 2);
    const rviPeriod = intSetting(config.rvi_period, 14, 2);
    if (period === null || rviPeriod === null) return { value: nulls(bars.length) };
    const x = readSource(bars, config);
    // The RVI: the standard deviation (population) put on up bars and on down bars, each averaged.
    const std = rollingVar(x, rviPeriod).map(Math.sqrt);
    const change = diff(x, 1);
    const upStd = std.map((s, i) => (change[i] > 0 ? 1 : 0) * s);
    const downStd = std.map((s, i) => (change[i] < 0 ? 1 : 0) * s);
    const upAvg = ptacEma(upStd, rviPeriod);
    const downAvg = ptacEma(downStd, rviPeriod);
    const rvi = upAvg.map((u, i) => (100 * u) / (u + downAvg[i]));
    return { value: toOutput(ptacLinreg(rvi, period, 'value')) };
};
