// packages/indicators/src/formulas/moving_averages/rma.ts
//
// Wilder's Moving Average (RMA): the formula, ported from pandas-ta-classic's overlap/rma.py.
// Held to its oracle fixture, rma.json. PURE.

import { seededEwm, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 10);
    if (period === null) return { value: nulls(bars.length) };
    return { value: toOutput(seededEwm(readSource(bars, config), period, 1.0 / period)) };
};
