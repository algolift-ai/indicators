// packages/indicators/src/formulas/momentum/apo.ts
//
// Absolute Price Oscillator (APO): the formula, ported from TA-Lib's ta_APO.c.
// Held to its oracle fixture, apo.json. PURE.

import { talibEma } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    let fast = intSetting(config.fast, 12, 2);
    let slow = intSetting(config.slow, 26, 2);
    if (fast === null || slow === null) return { value };
    if (slow < fast) [fast, slow] = [slow, fast];
    const x = readSource(bars, config);
    const f = talibEma(x, fast);
    const s = talibEma(x, slow);
    for (let i = slow - 1; i < n; i++) value[i] = f[i] - s[i];
    return { value };
};
