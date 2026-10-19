// packages/indicators/src/formulas/volatility/atr_stop.ts
//
// ATR Trailing Stop: the formula, ported from pandas-ta's volatility/atrts.py.
// Held to its oracle fixture, atr_stop.json. PURE.

import { column, ewm, nans, npSum, ptaTrueRange, type Series, spanAlpha, toOutput } from '../../core/libmath';
import { intSetting, nulls, numSetting } from '../../core/shared';
import type { Formula } from '../../types';

/**
 * pandas-ta's seeded EMA without TA-Lib (overlap/ema, presma): the mean of the
 * first `length` values on bar length - 1, then pandas' ewm. pandas' mean skips
 * NaN; over a window with none it is numpy's pairwise sum.
 */
function ptaEma(x: Series, length: number): Series {
    if (x.length < length) return nans(x.length);
    const seen: number[] = [];
    for (let i = 0; i < length; i++) if (x[i] === x[i]) seen.push(x[i]);
    const y = x.slice();
    for (let i = 0; i < length - 1; i++) y[i] = NaN;
    y[length - 1] = npSum(seen) / seen.length;
    return ewm(y, spanAlpha(length));
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 14);
    const maPeriod = intSetting(config.ma_period, 20);
    const k = numSetting(config.multiplier, 3, 0, Infinity, { openMin: true });
    if (period === null || maPeriod === null || k === null || n < period + maPeriod) return { value: nulls(n) };
    const close = column(bars, 'close');
    // The library's ATR under its EMA: the true range with its first `period`
    // bars' mean on bar period - 1, then the EMA (whose own seed is that mean again).
    const atr = ptaEma(ptaTrueRange(bars), period).map((a) => a * k);
    const ma = ptaEma(close, maPeriod);
    const result = nans(n);
    for (let i = Math.max(period, maPeriod); i < n; i++) {
        const pr = result[i - 1];
        let r: number;
        if (close[i] > ma[i]) {
            r = close[i] - atr[i];
            if (r < pr) r = pr;
        } else {
            r = close[i] + atr[i];
            if (r > pr) r = pr;
        }
        result[i] = r;
    }
    return { value: toOutput(result) };
};
