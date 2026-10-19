// packages/indicators/src/formulas/volatility/hwc.ts
//
// Holt-Winters Channel: the formula, ported from pandas-ta-classic's volatility/hwc.py.
// Held to its oracle fixture, hwc.json. PURE.

import { nulls, numSetting, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const middle = nulls(n);
    const upper = nulls(n);
    const lower = nulls(n);
    const open = { openMin: true, openMax: true };
    const na = numSetting(config.alpha, 0.2, 0, 1, open);
    const nb = numSetting(config.beta, 0.1, 0, 1, open);
    const nc = numSetting(config.gamma, 0.1, 0, 1, open);
    const nd = numSetting(config.delta, 0.1, 0, 1, open);
    const scalar = numSetting(config.multiplier, 1, 0, Infinity, { openMin: true });
    if (na === null || nb === null || nc === null || nd === null || scalar === null || n === 0) return { middle, upper, lower };
    const x = readSource(bars, config);
    let lastA = 0.0;
    let lastV = 0.0;
    let lastVar = 0.0;
    let lastF = x[0];
    let lastPrice = x[0];
    let lastResult = x[0];
    for (let i = 0; i < n; i++) {
        const f = (1.0 - na) * (lastF + lastV + 0.5 * lastA) + na * x[i];
        const v = (1.0 - nb) * (lastV + lastA) + nb * (f - lastF);
        const a = (1.0 - nc) * lastA + nc * (v - lastV);
        const result = f + v + 0.5 * a;
        const variance = (1.0 - nd) * lastVar + nd * (lastPrice - lastResult) * (lastPrice - lastResult);
        // The bands use the deviation known before this bar (the library's order).
        const stddev = Math.sqrt(lastVar);
        middle[i] = result;
        upper[i] = result + scalar * stddev;
        lower[i] = result - scalar * stddev;
        lastPrice = x[i];
        lastA = a;
        lastF = f;
        lastV = v;
        lastVar = variance;
        lastResult = result;
    }
    return { middle, upper, lower };
};
