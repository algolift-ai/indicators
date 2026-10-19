// packages/indicators/src/formulas/volume/eom.ts
//
// Ease of Movement (EOM): the formula, ported from pandas-ta-classic's volume/eom.py.
// Held to its oracle fixture, eom.json. PURE.

import { rollingMean, toOutput } from '../../core/libmath';
import { intSetting, nulls, numSetting } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 14);
    const divisor = numSetting(config.divisor, 100000000, 1);
    if (period === null || divisor === null) return { value: nulls(n) };
    const raw: DataArray = nulls(n);
    for (let i = 1; i < n; i++) {
        const b = bars[i];
        const p = bars[i - 1];
        const diff = b.high - b.low;
        const range = diff !== 0 ? diff : Number.EPSILON;
        const distance = 0.5 * (b.high + b.low) - 0.5 * (p.high + p.low);
        let boxRatio = b.volume / divisor;
        boxRatio /= range;
        raw[i] = distance / boxRatio;
    }
    return { value: toOutput(rollingMean(raw, period)) };
};
