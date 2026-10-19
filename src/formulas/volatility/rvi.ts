// packages/indicators/src/formulas/volatility/rvi.ts
//
// Relative Volatility Index (RVI): the formula, ported from pandas-ta-classic's volatility/rvi.py.
// Held to its oracle fixture, rvi.json. PURE.

import { column, diff, ptacEma, rollingVar, type Series, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** The RVI of one series: its standard deviation put on up bars and on down bars, each averaged, as a share of both. */
function rviOf(x: Series, period: number): Series {
    const std = rollingVar(x, period).map(Math.sqrt);
    const change = diff(x, 1);
    // The library's unsigned differences: 1 where the series rose (or fell), 0 otherwise, the first bar included.
    const upAvg = ptacEma(std.map((s, i) => (change[i] > 0 ? 1 : 0) * s), period);
    const downAvg = ptacEma(std.map((s, i) => (change[i] < 0 ? 1 : 0) * s), period);
    return upAvg.map((u, i) => (100 * u) / (u + downAvg[i]));
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 14, 2);
    if (period === null) return { value: nulls(bars.length) };
    if (config.method === 'refined') {
        const high = rviOf(column(bars, 'high'), period);
        const low = rviOf(column(bars, 'low'), period);
        return { value: toOutput(high.map((h, i) => 0.5 * (h + low[i]))) };
    }
    if (config.method === 'thirds') {
        const high = rviOf(column(bars, 'high'), period);
        const low = rviOf(column(bars, 'low'), period);
        const src = rviOf(readSource(bars, config), period);
        return { value: toOutput(high.map((h, i) => (h + low[i] + src[i]) / 3.0)) };
    }
    return { value: toOutput(rviOf(readSource(bars, config), period)) };
};
