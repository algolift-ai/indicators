// packages/indicators/src/formulas/volume/vosc.ts
//
// Volume Oscillator: the formula, ported from pandas-ta-classic's volume/vosc.py.
// Held to its oracle fixture, vosc.json. PURE.

import { rollingMean, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    let fast = intSetting(config.fast, 14);
    let slow = intSetting(config.slow, 28);
    if (fast === null || slow === null) return { value: nulls(n) };
    if (fast > slow) [fast, slow] = [slow, fast];
    const volume = bars.map((b) => b.volume);
    const f = toOutput(rollingMean(volume, fast));
    const s = toOutput(rollingMean(volume, slow));
    const value: DataArray = f.map((v, i) => {
        const sv = s[i];
        if (v === null || sv === null) return null;
        const r = (100 * (v - sv)) / sv;
        return Number.isFinite(r) ? r : null;
    });
    return { value };
};
