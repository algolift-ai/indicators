// packages/indicators/src/formulas/trend_strength/cksp.ts
//
// Chande Kroll Stop (CKSP): the formula, ported from pandas-ta-classic's trend/cksp.py.
// Held to its oracle fixture, cksp.json. PURE.

import { ptacAtr, rollingMax, rollingMin, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const longStop: DataArray = nulls(n);
    const shortStop: DataArray = nulls(n);
    const p = intSetting(config.period, 10);
    const q = intSetting(config.stop_period, 20);
    const x = Number(config.multiplier ?? 3);
    if (p === null || q === null || !(x > 0)) return { long_stop: longStop, short_stop: shortStop };
    const atr = ptacAtr(bars, p, config.smoothing === 'simple' ? 'sma' : 'rma');
    const hh = rollingMax(bars.map((b) => b.high), p);
    const ll = rollingMin(bars.map((b) => b.low), p);
    const long0 = hh.map((h, i) => h - x * atr[i]);
    const short0 = ll.map((l, i) => l + x * atr[i]);
    return { long_stop: toOutput(rollingMax(long0, q)), short_stop: toOutput(rollingMin(short0, q)) };
};
