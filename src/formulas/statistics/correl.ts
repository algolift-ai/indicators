// packages/indicators/src/formulas/statistics/correl.ts
//
// Correlation: the formula, ported from TA-Lib's ta_CORREL.c.
// Held to its oracle fixture, correl.json. PURE.

import { intSetting, nulls, type SourceName, SOURCES } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 30, 2);
    if (period === null) return { value };
    const a = bars.map(SOURCES[config.series_a as SourceName] ?? SOURCES.high);
    const b = bars.map(SOURCES[config.series_b as SourceName] ?? SOURCES.low);
    const invPeriod = 1.0 / period;
    for (let i = period - 1; i < n; i++) {
        const start = i - period + 1;
        // Shift by the window's means, as TA-Lib does when it reseeds.
        let ta = 0.0;
        let tb = 0.0;
        for (let j = start; j <= i; j++) {
            ta += a[j];
            tb += b[j];
        }
        const shiftX = ta * invPeriod;
        const shiftY = tb * invPeriod;
        let sumX = 0.0;
        let sumX2 = 0.0;
        let sumY = 0.0;
        let sumY2 = 0.0;
        let sumXY = 0.0;
        for (let j = start; j <= i; j++) {
            const x = a[j] - shiftX;
            sumX += x;
            sumX2 += x * x;
            const y = b[j] - shiftY;
            sumXY += x * y;
            sumY += y;
            sumY2 += y * y;
        }
        let ssX = sumX2 - sumX * sumX * invPeriod;
        let ssY = sumY2 - sumY * sumY * invPeriod;
        const spXY = sumXY - sumX * sumY * invPeriod;
        if (ssX < 0.0) ssX = 0.0;
        if (ssY < 0.0) ssY = 0.0;
        if (ssX > 0.00000000000001 * sumX2 && ssY > 0.00000000000001 * sumY2 && ssX * ssY > 0.0) {
            const r = spXY / Math.sqrt(ssX * ssY);
            value[i] = r > 1.0 ? 1.0 : r < -1.0 ? -1.0 : r;
        } else {
            value[i] = 0.0;
        }
    }
    return { value };
};
