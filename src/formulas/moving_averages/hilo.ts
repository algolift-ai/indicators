// packages/indicators/src/formulas/moving_averages/hilo.ts
//
// Gann HiLo Activator: the formula, ported from pandas-ta-classic's overlap/hilo.py.
// Held to its oracle fixture, hilo.json. PURE.

import { rollingMean, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const highPeriod = intSetting(config.high_period, 13);
    const lowPeriod = intSetting(config.low_period, 21);
    if (highPeriod === null || lowPeriod === null) return { value };
    const highMa = toOutput(rollingMean(bars.map((b) => b.high), highPeriod));
    const lowMa = toOutput(rollingMean(bars.map((b) => b.low), lowPeriod));
    for (let i = 1; i < n; i++) {
        const close = bars[i].close;
        const highPrev = highMa[i - 1];
        const lowPrev = lowMa[i - 1];
        if (highPrev !== null && close > highPrev) value[i] = lowMa[i];
        else if (lowPrev !== null && close < lowPrev) value[i] = highMa[i];
        else value[i] = value[i - 1];
    }
    return { value };
};
