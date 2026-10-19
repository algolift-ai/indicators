// packages/indicators/src/formulas/volume/tsv.ts
//
// Time Segmented Volume (TSV): the formula, ported from pandas-ta's volume/tsv.py.
// Held to its oracle fixture, tsv.json. PURE.

import { rollingSum, signedSeries, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/**
 * TA-Lib's SMA (pandas-ta's "sma" runs it when TA-Lib is installed): from the
 * first value on, a running total with the oldest value taken away after
 * each average, in TA-Lib's order of operations.
 */
function talibSma(x: DataArray, period: number): DataArray {
    const n = x.length;
    const out: DataArray = nulls(n);
    let start = 0;
    while (start < n && x[start] === null) start++;
    if (start + period > n) return out;
    const v = x as number[];
    let total = 0;
    let i = start;
    let trailing = start;
    for (; i < start + period - 1; i++) total += v[i];
    for (; i < n; i++) {
        total += v[i];
        const t = total;
        total -= v[trailing++];
        out[i] = t / period;
    }
    return out;
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 18);
    const signal = intSetting(config.signal, 10);
    if (period === null || signal === null) return { value: nulls(n), signal: nulls(n), ratio: nulls(n) };
    const sign = signedSeries(bars.map((b) => b.close));
    const cvd: DataArray = bars.map((b, i) => (i === 0 ? null : Math.abs(b.volume * sign[i]) * (b.close - bars[i - 1].close)));
    const value = toOutput(rollingSum(cvd, period));
    const sig = talibSma(value, signal);
    const ratio: DataArray = value.map((v, i) => {
        const s = sig[i];
        if (v === null || s === null) return null;
        const r = v / s;
        return Number.isFinite(r) ? r : null;
    });
    return { value, signal: sig, ratio };
};
