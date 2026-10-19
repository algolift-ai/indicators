// packages/indicators/src/formulas/momentum/kst.ts
//
// Know Sure Thing (KST): the formula, ported from pandas-ta-classic's momentum/kst.py.
// Held to its oracle fixture, kst.json. PURE.

import { diff, rollingMean, shift, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

export const ROCS = [10, 15, 20, 30] as const;
export const SMAS = [10, 10, 10, 15] as const;

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const rocs = ROCS.map((d, i) => intSetting(config[`roc${i + 1}`], d));
    const smas = SMAS.map((d, i) => intSetting(config[`sma${i + 1}`], d));
    const signal = intSetting(config.signal, 9);
    if ([...rocs, ...smas, signal].some((v) => v === null)) return { value: nulls(n), signal: nulls(n) };
    const x = readSource(bars, config);
    const smoothed = rocs.map((r, i) => {
        const d = diff(x, r!);
        const then = shift(x, r!);
        return rollingMean(d.map((v, j) => (100 * v) / then[j]), smas[i]!);
    });
    const [a, b, c, e] = smoothed;
    const kst = a.map((v, i) => v + 2 * b[i] + 3 * c[i] + 4 * e[i]);
    return { value: toOutput(kst), signal: toOutput(rollingMean(kst, signal!)) };
};
