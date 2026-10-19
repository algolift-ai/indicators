// packages/indicators/src/formulas/trend_strength/pmax.ts
//
// PMax (profit maximizer): the formula, ported from pandas-ta-classic's trend/pmax.py.
// Held to its oracle fixture, pmax.json. PURE.

import { nans, ptacAtr, ptacEma, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 10);
    const multiplier = Number(config.multiplier ?? 3);
    if (period === null || !(multiplier > 0) || n === 0) return { value };
    const atr = ptacAtr(bars, period, 'rma');
    const ma = ptacEma(bars.map((b) => b.close), period);
    const up = ma.map((m, i) => m - multiplier * atr[i]);
    const down = ma.map((m, i) => m + multiplier * atr[i]);
    // The library's loop: each band ratchets while the previous close holds beyond it, and a NaN compares false.
    const out = nans(n);
    let trend = 1;
    for (let i = 1; i < n; i++) {
        const prevClose = bars[i - 1].close;
        if (prevClose > up[i - 1]) up[i] = Math.max(up[i], up[i - 1]);
        if (prevClose < down[i - 1]) down[i] = Math.min(down[i], down[i - 1]);
        if (bars[i].close > down[i - 1]) trend = 1;
        else if (bars[i].close < up[i - 1]) trend = -1;
        out[i] = trend === 1 ? up[i] : down[i];
    }
    return { value: toOutput(out) };
};
