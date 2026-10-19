// packages/indicators/src/formulas/moving_averages/hwma.ts
//
// Holt-Winters Moving Average (HWMA): the formula, ported from pandas-ta-classic's overlap/hwma.py.
// Held to its oracle fixture, hwma.json. PURE.

import { nulls, numSetting, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const open = { openMin: true, openMax: true };
    const na = numSetting(config.alpha, 0.2, 0, 1, open);
    const nb = numSetting(config.beta, 0.1, 0, 1, open);
    const nc = numSetting(config.gamma, 0.1, 0, 1, open);
    if (na === null || nb === null || nc === null || n === 0) return { value };
    const x = readSource(bars, config);
    let lastA = 0.0;
    let lastV = 0.0;
    let lastF = x[0];
    for (let i = 0; i < n; i++) {
        const f = (1.0 - na) * (lastF + lastV + 0.5 * lastA) + na * x[i];
        const v = (1.0 - nb) * (lastV + lastA) + nb * (f - lastF);
        const a = (1.0 - nc) * lastA + nc * (v - lastV);
        value[i] = f + v + 0.5 * a;
        lastA = a;
        lastF = f;
        lastV = v;
    }
    return { value };
};
