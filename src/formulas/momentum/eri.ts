// packages/indicators/src/formulas/momentum/eri.ts
//
// Elder Ray (Bull and Bear Power): the formula, ported from pandas-ta-classic's momentum/eri.py.
// Held to its oracle fixture, eri.json. PURE.

import { column, ptacEma, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 13);
    if (period === null) return { bull: nulls(bars.length), bear: nulls(bars.length) };
    const ema = ptacEma(column(bars, 'close'), period);
    return {
        bull: toOutput(bars.map((b, i) => b.high - ema[i])),
        bear: toOutput(bars.map((b, i) => b.low - ema[i])),
    };
};
