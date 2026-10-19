// packages/indicators/src/formulas/volume/kvo.ts
//
// Klinger Volume Oscillator (KVO): the formula, ported from pandas-ta-classic's volume/kvo.py.
// Held to its oracle fixture, kvo.json. PURE.

import { ptacEma, signedSeries, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const fast = intSetting(config.fast, 34);
    const slow = intSetting(config.slow, 55);
    const signal = intSetting(config.signal, 13);
    if (fast === null || slow === null || signal === null) return { value: nulls(n), signal: nulls(n) };
    const sign = signedSeries(bars.map((b) => (b.high + b.low + b.close) / 3.0));
    const sv = bars.map((b, i) => b.volume * sign[i]);
    const f = toOutput(ptacEma(sv, fast));
    const s = toOutput(ptacEma(sv, slow));
    const value: DataArray = f.map((v, i) => (v === null || s[i] === null ? null : v - (s[i] as number)));
    return { value, signal: toOutput(ptacEma(value, signal)) };
};
