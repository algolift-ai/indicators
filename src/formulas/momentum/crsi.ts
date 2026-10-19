// packages/indicators/src/formulas/momentum/crsi.ts
//
// Connors RSI: the formula, ported from pandas-ta's momentum/crsi.py.
// Held to its oracle fixture, crsi.json. PURE.

import { diff, directAlpha, ewm, nans, type Series, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** pandas-ta's rsi(): unseeded Wilder averages of the gains and the losses. */
function ptaRsi(x: Series, length: number): Series {
    const change = diff(x, 1);
    const alpha = directAlpha(1 / length);
    const gain = ewm(change.map((d) => (d < 0 ? 0 : d)), alpha);
    const loss = ewm(change.map((d) => (d > 0 ? 0 : d)), alpha);
    return gain.map((g, i) => (100 * g) / (g + Math.abs(loss[i])));
}

/** Connors' streak: +1, +2 ... for consecutive rises, -1, -2 ... for falls, 0 on an unchanged value. */
function streak(x: Series): Series {
    const out = new Array(x.length).fill(0);
    for (let i = 1; i < x.length; i++) {
        if (x[i] > x[i - 1]) out[i] = out[i - 1] > 0 ? out[i - 1] + 1 : 1;
        else if (x[i] < x[i - 1]) out[i] = out[i - 1] < 0 ? out[i - 1] - 1 : -1;
    }
    return out;
}

/** The percent of the previous n one-bar returns below this bar's return. */
function percentRank(x: Series, length: number): Series {
    const ret = x.map((v, i) => (i > 0 ? v / x[i - 1] - 1 : NaN));
    const out = nans(x.length);
    for (let i = length; i < x.length; i++) {
        let below = 0;
        for (let j = i - length; j < i; j++) if (ret[j] < ret[i]) below++;
        out[i] = 100 * (below / length);
    }
    return out;
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const rsiPeriod = intSetting(config.rsi_period, 3);
    const streakPeriod = intSetting(config.streak_period, 2);
    const rankPeriod = intSetting(config.rank_period, 100);
    if (rsiPeriod === null || streakPeriod === null || rankPeriod === null) return { value: nulls(bars.length) };
    const x = readSource(bars, config);
    const a = ptaRsi(x, rsiPeriod);
    const b = ptaRsi(streak(x), streakPeriod);
    const c = percentRank(x, rankPeriod);
    return { value: toOutput(a.map((v, i) => (v + b[i] + c[i]) / 3.0)) };
};
