// packages/indicators/src/formulas/momentum/pgo.ts
//
// Pretty Good Oscillator (PGO): the formula, ported from pandas-ta-classic's momentum/pgo.py.
// Held to its oracle fixture, pgo.json. PURE.

import { column, ptacEma, ptacRma, ptacTrueRange, rollingMean, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 14);
    if (period === null) return { value: nulls(bars.length) };
    const close = column(bars, 'close');
    const ma = rollingMean(close, period);
    const atr = ptacRma(ptacTrueRange(bars), period);
    const scale = ptacEma(atr, period);
    return { value: toOutput(close.map((c, i) => (c - ma[i]) / scale[i])) };
};
