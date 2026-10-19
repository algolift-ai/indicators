// packages/indicators/src/formulas/cycles/reflex.ts
//
// Reflex (Ehlers): the formula, ported from pandas-ta's cycle/reflex.py.
// Held to its oracle fixture, reflex.json. PURE.

import { ehlersFlexSmoother } from '../../core/libmath';
import { intSetting, nulls, numSetting, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 20);
    const smooth = intSetting(config.smooth, 20);
    const alpha = numSetting(config.alpha, 0.04, 0, 1, { openMin: true });
    if (period === null || smooth === null || alpha === null || n < Math.max(period, smooth) + 1) return { value };
    const f = ehlersFlexSmoother(readSource(bars, config), smooth);
    let ms = 0;
    for (let i = period; i < n; i++) {
        const slope = (f[i - period] - f[i]) / period;
        let sum = 0;
        for (let j = 1; j < period; j++) sum += f[i] - f[i - j] + j * slope;
        sum /= period;
        ms = alpha * sum * sum + (1 - alpha) * ms;
        value[i] = ms !== 0.0 ? sum / Math.sqrt(ms) : 0;
    }
    return { value };
};
