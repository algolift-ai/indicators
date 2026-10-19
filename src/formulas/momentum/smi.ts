// packages/indicators/src/formulas/momentum/smi.ts
//
// SMI Ergodic: the formula, ported from pandas-ta-classic's momentum/smi.py.
// Held to its oracle fixture, smi.json. PURE.

import { diff, ptacEma, toOutput, zip } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    let fast = intSetting(config.fast, 5);
    let slow = intSetting(config.slow, 20);
    const signal = intSetting(config.signal, 5);
    if (fast === null || slow === null || signal === null) return { value: nulls(n), signal: nulls(n), histogram: nulls(n) };
    if (slow < fast) [fast, slow] = [slow, fast];
    const change = diff(readSource(bars, config), 1);
    const num = ptacEma(ptacEma(change, slow), fast);
    const den = ptacEma(ptacEma(change.map(Math.abs), slow), fast);
    const smi = zip(num, den, (a, b) => (1 * a) / b);
    const sig = ptacEma(smi, signal);
    return { value: toOutput(smi), signal: toOutput(sig), histogram: toOutput(zip(smi, sig, (a, b) => a - b)) };
};
