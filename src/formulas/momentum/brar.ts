// packages/indicators/src/formulas/momentum/brar.ts
//
// BRAR: the formula, ported from pandas-ta-classic's momentum/brar.py.
// Held to its oracle fixture, brar.json. PURE.

import { column, nonZeroRange, rollingSum, shift, toOutput, zip } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 26);
    if (period === null) return { ar: nulls(bars.length), br: nulls(bars.length) };
    const [open, high, low, close] = (['open', 'high', 'low', 'close'] as const).map((k) => column(bars, k));
    const prevClose = shift(close, 1);
    const floor = (x: number[]) => x.map((v) => (v < 0 ? 0 : v));
    const ratio = (up: number[], down: number[]) => zip(rollingSum(up, period), rollingSum(down, period), (u, d) => (100 * u) / d);
    return {
        ar: toOutput(ratio(nonZeroRange(high, open), nonZeroRange(open, low))),
        br: toOutput(ratio(floor(nonZeroRange(high, prevClose)), floor(nonZeroRange(prevClose, low)))),
    };
};
