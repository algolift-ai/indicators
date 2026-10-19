// packages/indicators/src/formulas/volatility/massi.ts
//
// Mass Index: the formula, ported from pandas-ta-classic's volatility/massi.py.
// Held to its oracle fixture, massi.json. PURE.

import { column, nonZeroRange, ptacEma, rollingSum, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    let fast = intSetting(config.fast, 9);
    let slow = intSetting(config.slow, 25);
    if (fast === null || slow === null) return { value: nulls(bars.length) };
    if (slow < fast) [fast, slow] = [slow, fast];
    const range = nonZeroRange(column(bars, 'high'), column(bars, 'low'));
    const ema1 = ptacEma(range, fast);
    const ema2 = ptacEma(ema1, fast);
    return { value: toOutput(rollingSum(ema1.map((e, i) => e / ema2[i]), slow)) };
};
