// packages/indicators/src/formulas/trend_strength/alphatrend.ts
//
// AlphaTrend: the formula, ported from pandas-ta's trend/alphatrend.py.
// Held to its oracle fixture, alphatrend.json. PURE.

import { EPSILON, nans, ptaAtr, rollingMean, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula, SpecBar } from '../../types';

/** pandas-ta's RSI of the close with simple averages of the gains and losses. */
function rsiSma(bars: readonly SpecBar[], length: number): number[] {
    const n = bars.length;
    const pos = nans(n);
    const neg = nans(n);
    for (let i = 1; i < n; i++) {
        const d = bars[i].close - bars[i - 1].close;
        pos[i] = d < 0 ? 0 : d;
        neg[i] = d > 0 ? 0 : d;
    }
    const p = rollingMean(pos, length);
    const m = rollingMean(neg, length);
    return p.map((v, i) => (100 * v) / (v + Math.abs(m[i])));
}

/** pandas-ta's money flow index without TA-Lib: a window's positive flow over its whole flow (plus EPSILON). */
function mfi(bars: readonly SpecBar[], length: number): number[] {
    const n = bars.length;
    const tp = bars.map((b) => (b.high + b.low + b.close) / 3.0);
    const pos = new Array<number>(n);
    const neg = new Array<number>(n);
    for (let i = 0; i < n; i++) {
        // The library compares each typical price with the previous one, the first with the last (a wrap-around it later discards).
        const prev = tp[i === 0 ? n - 1 : i - 1];
        const smf = tp[i] * bars[i].volume * (tp[i] > prev ? 1 : -1);
        pos[i] = Math.max(smf, 0);
        neg[i] = Math.max(-smf, 0);
    }
    const out = nans(n);
    for (let i = length; i < n; i++) {
        let gain = 0;
        let loss = 0;
        for (let j = i - length + 1; j <= i; j++) {
            gain += pos[j];
            loss += neg[j];
        }
        out[i] = (100.0 * gain) / (gain + loss + EPSILON);
    }
    return out;
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const signal: DataArray = nulls(n);
    const period = intSetting(config.period, 14, 2);
    const lag = intSetting(config.lag, 2);
    const multiplier = Number(config.multiplier ?? 1);
    const threshold = Number(config.threshold ?? 50);
    if (period === null || lag === null || !(multiplier > 0) || !(threshold > 0) || n <= period) return { value, signal };
    const atr = ptaAtr(bars, period, 'sma');
    const momo = config.momentum === 'mfi' ? mfi(bars, period) : rsiSma(bars, period);
    // The line starts from 0 on bar 0 (written NaN afterwards, as the library does), and a NaN compares false.
    const at = new Array<number>(n).fill(0);
    for (let i = 1; i < n; i++) {
        if (momo[i] >= threshold) {
            const lower = bars[i].low - atr[i] * multiplier;
            at[i] = lower < at[i - 1] ? at[i - 1] : lower;
        } else {
            const upper = bars[i].high + atr[i] * multiplier;
            at[i] = upper > at[i - 1] ? at[i - 1] : upper;
        }
    }
    at[0] = NaN;
    const lagged = nans(n);
    for (let i = lag; i < n; i++) lagged[i] = at[i - lag];
    return { value: toOutput(at), signal: toOutput(lagged) };
};
