// packages/indicators/src/formulas/statistics/beta.ts
//
// Beta: the formula, ported from TA-Lib's ta_BETA.c.
// Held to its oracle fixture, beta.json. PURE.

import { intSetting, nulls, type SourceName, SOURCES } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 5, 2);
    if (period === null) return { value };
    const px = bars.map(SOURCES[config.benchmark as SourceName] ?? SOURCES.high);
    const py = bars.map(SOURCES[config.series as SourceName] ?? SOURCES.low);
    // The return into bar j; TA-Lib counts it as 0 where the bar before is 0.
    const ret = (p: number[], j: number) => (p[j - 1] !== 0.0 ? (p[j] - p[j - 1]) / p[j - 1] : 0.0);
    const nn = period;
    for (let i = period; i < n; i++) {
        const start = i - period + 1;
        // Shift by the window's mean return, as TA-Lib does when it reseeds.
        let tx = 0.0;
        let ty = 0.0;
        for (let j = start; j <= i; j++) {
            if (px[j - 1] !== 0.0) tx += (px[j] - px[j - 1]) / px[j - 1];
            if (py[j - 1] !== 0.0) ty += (py[j] - py[j - 1]) / py[j - 1];
        }
        const shiftX = tx / nn;
        const shiftY = ty / nn;
        let sxx = 0.0;
        let sxy = 0.0;
        let sx = 0.0;
        let sy = 0.0;
        for (let j = start; j <= i; j++) {
            const x = ret(px, j) - shiftX;
            const y = ret(py, j) - shiftY;
            sxx += x * x;
            sxy += x * y;
            sx += x;
            sy += y;
        }
        const denomScale = nn * sxx;
        let denom = denomScale - sx * sx;
        if (denom < 0.0) denom = 0.0;
        value[i] = denom > 0.00000000000001 * denomScale ? (nn * sxy - sx * sy) / denom : 0.0;
    }
    return { value };
};
