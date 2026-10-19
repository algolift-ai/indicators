// packages/indicators/src/formulas/moving_averages/zlma.ts
//
// Zero-Lag Moving Average (ZLMA): the formula, ported from pandas-ta-classic's overlap/zlma.py.
// Held to its oracle fixture, zlma.json. PURE.

import { seededEwm, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 10);
    if (period === null) return { value: nulls(n) };
    const x = readSource(bars, config);
    const lag = Math.trunc(0.5 * (period - 1));
    const corrected: DataArray = x.map((v, i) => (i >= lag ? 2 * v - x[i - lag] : null));
    return { value: toOutput(seededEwm(corrected, period, 2 / (period + 1))) };
};
