// packages/indicators/src/formulas/momentum/vwmacd.ts
//
// Volume-Weighted MACD (VWMACD): the formula, ported from pandas-ta-classic's momentum/vwmacd.py.
// Held to its oracle fixture, vwmacd.json. PURE.

import { column, rollingMean, type Series, toOutput, zip } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    let fast = intSetting(config.fast, 12);
    let slow = intSetting(config.slow, 26);
    const signal = intSetting(config.signal, 9);
    if (fast === null || slow === null || signal === null) return { value: nulls(n), signal: nulls(n), histogram: nulls(n) };
    if (slow < fast) [fast, slow] = [slow, fast];
    const volume = column(bars, 'volume');
    const vwma = (x: Series, length: number) =>
        zip(rollingMean(x.map((v, i) => v * volume[i]), length), rollingMean(volume, length), (a, b) => a / b);
    const close = column(bars, 'close');
    const macd = zip(vwma(close, fast), vwma(close, slow), (a, b) => a - b);
    const sig = vwma(macd, signal);
    return { value: toOutput(macd), signal: toOutput(sig), histogram: toOutput(zip(macd, sig, (a, b) => a - b)) };
};
