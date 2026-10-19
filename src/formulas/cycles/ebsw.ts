// packages/indicators/src/formulas/cycles/ebsw.ts
//
// Even Better Sinewave (Ehlers): the formula, ported from pandas-ta-classic's cycles/ebsw.py.
// Held to its oracle fixture, ebsw.json. PURE.

import { deg2rad } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const length = intSetting(config.period, 40, 39);
    const smooth = intSetting(config.smooth, 10);
    if (length === null || smooth === null || n < length) return { value };
    const x = readSource(bars, config);
    // Ehlers' angles are degrees (his EasyLanguage); the library reads them as radians.
    const alpha1 = (1 - Math.sin(deg2rad(360 / length))) / Math.cos(deg2rad(360 / length));
    const a1 = Math.exp((-Math.SQRT2 * Math.PI) / smooth);
    const b1 = 2 * a1 * Math.cos(deg2rad((Math.SQRT2 * 180) / smooth));
    const c2 = b1;
    const c3 = -1 * a1 * a1;
    const c1 = 1 - c2 - c3;
    let lastClose = 0.0;
    let lastHP = 0.0;
    let fh0 = 0.0;
    let fh1 = 0.0;
    value[length - 1] = 0.0;
    for (let i = length; i < n; i++) {
        const HP = 0.5 * (1 + alpha1) * (x[i] - lastClose) + alpha1 * lastHP;
        const filt = (c1 * (HP + lastHP)) / 2 + c2 * fh1 + c3 * fh0;
        // The wave and its power over the last three bars; the wave over the root of the power.
        const wave = (filt + fh1 + fh0) / 3;
        const pwr = (filt * filt + fh1 * fh1 + fh0 * fh0) / 3;
        value[i] = pwr > 0 ? wave / Math.sqrt(pwr) : 0.0;
        fh0 = fh1;
        fh1 = filt;
        lastHP = HP;
        lastClose = x[i];
    }
    return { value };
};
