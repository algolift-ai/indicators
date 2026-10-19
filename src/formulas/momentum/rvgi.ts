// packages/indicators/src/formulas/momentum/rvgi.ts
//
// Relative Vigor Index (RVGI): the formula, ported from pandas-ta-classic's momentum/rvgi.py.
// Held to its oracle fixture, rvgi.json. PURE.

import { column, nonZeroRange, ptacSwma, rollingSum, toOutput, zip } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 14);
    const smooth = intSetting(config.smooth, 4);
    if (period === null || smooth === null) return { value: nulls(n), signal: nulls(n), histogram: nulls(n) };
    const [open, high, low, close] = (['open', 'high', 'low', 'close'] as const).map((k) => column(bars, k));
    const num = rollingSum(ptacSwma(nonZeroRange(close, open), smooth), period);
    const den = rollingSum(ptacSwma(nonZeroRange(high, low), smooth), period);
    const rvgi = zip(num, den, (a, b) => a / b);
    const signal = ptacSwma(rvgi, smooth);
    return { value: toOutput(rvgi), signal: toOutput(signal), histogram: toOutput(zip(rvgi, signal, (a, b) => a - b)) };
};
