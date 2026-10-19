// packages/indicators/src/formulas/trend_strength/trend_bars.ts
//
// Trend Bars (six-bar trend): the formula, ported from pandas-ta-classic's trend/ttm_trend.py.
// Held to its oracle fixture, trend_bars.json. PURE.

import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula, OracleTerms } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 6);
    if (period === null) return { value };
    const hl2 = bars.map((b) => 0.5 * (b.high + b.low));
    for (let i = period - 1; i < n; i++) {
        // Summed newest first, as the library adds each shifted midpoint in turn.
        let sum = hl2[i];
        for (let k = 1; k < period; k++) sum = sum + hl2[i - k];
        value[i] = bars[i].close > sum / period ? 1 : 0;
    }
    return { value };
};

/** How it meets its oracle fixture, beyond the default comparison. */
export const oracle: OracleTerms = {
    skipLeading: (c) => Number(c.period) - 1,
    reason: 'The library writes -1 (a down bar) on the first period - 1 bars, where its average midpoint is NaN and the comparison reads false; the study writes null there, since no bar can be judged before n midpoints exist.',
};
