// packages/indicators/src/formulas/volatility/pdist.ts
//
// Price Distance: the formula, ported from pandas-ta-classic's volatility/pdist.py.
// Held to its oracle fixture, pdist.json. PURE.

import { column, nonZeroRange, shift, toOutput } from '../../core/libmath';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars) => {
    const open = column(bars, 'open');
    const close = column(bars, 'close');
    const range = nonZeroRange(column(bars, 'high'), column(bars, 'low'));
    const gap = nonZeroRange(open, shift(close, 1));
    const body = nonZeroRange(close, open);
    return { value: toOutput(range.map((r, i) => 2 * r + Math.abs(gap[i]) - Math.abs(body[i]))) };
};
