// packages/indicators/src/formulas/moving_averages/ht_trendline.ts
//
// Hilbert Transform Instantaneous Trendline: the formula, ported from TA-Lib's ta_HT_TRENDLINE.c.
// Held to its oracle fixture, ht_trendline.json. PURE.

import { runHilbert } from '../../core/hilbert';
import { nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** TA-Lib's fixed lookback: 63 bars before the first value. */
const LOOKBACK = 63;

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    if (n <= LOOKBACK) return { value };
    const x = readSource(bars, config);
    let smoothPeriod = 0.0;
    let iTrend1 = 0.0;
    let iTrend2 = 0.0;
    let iTrend3 = 0.0;
    runHilbert(
        x,
        34,
        () => {},
        (today, period) => {
            smoothPeriod = 0.67 * smoothPeriod + 0.33 * period;
            const dcPeriodInt = Math.trunc(smoothPeriod + 0.5);
            let sum = 0.0;
            for (let i = 0; i < 50; i++) if (i < dcPeriodInt && today - i >= 0) sum += x[today - i];
            if (dcPeriodInt > 0) sum = sum / dcPeriodInt;
            const trend = (2.0 * iTrend2 + (4.0 * sum + 3.0 * iTrend1) + iTrend3) / 10.0;
            iTrend3 = iTrend2;
            iTrend2 = iTrend1;
            iTrend1 = sum;
            if (today >= LOOKBACK) value[today] = trend;
        },
    );
    return { value };
};
