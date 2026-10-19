// packages/indicators/src/formulas/volatility/aberration.ts
//
// Aberration: the formula, ported from pandas-ta-classic's volatility/aberration.py.
// Held to its oracle fixture, aberration.json. PURE.

import { ptacAtr, rollingMean, toOutput } from '../../core/libmath';
import { intSetting, nulls, SOURCES } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 5);
    const atrPeriod = intSetting(config.atr_period, 15);
    if (period === null || atrPeriod === null) return { middle: nulls(n), upper: nulls(n), lower: nulls(n), atr: nulls(n) };
    const atr = ptacAtr(bars, atrPeriod);
    const middle = rollingMean(bars.map(SOURCES.hlc3), period);
    return {
        middle: toOutput(middle),
        upper: toOutput(middle.map((m, i) => m + atr[i])),
        lower: toOutput(middle.map((m, i) => m - atr[i])),
        atr: toOutput(atr),
    };
};
