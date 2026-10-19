// packages/indicators/src/formulas/volume/pvo.ts
//
// Percentage Volume Oscillator (PVO): the formula, ported from pandas-ta-classic's momentum/pvo.py.
// Held to its oracle fixture, pvo.json. PURE.

import { ptacEma, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    let fast = intSetting(config.fast, 12);
    let slow = intSetting(config.slow, 26);
    const signal = intSetting(config.signal, 9);
    if (fast === null || slow === null || signal === null) return { value: nulls(n), histogram: nulls(n), signal: nulls(n) };
    if (slow < fast) [fast, slow] = [slow, fast];
    const volume = bars.map((b) => b.volume);
    const f = toOutput(ptacEma(volume, fast));
    const s = toOutput(ptacEma(volume, slow));
    const value: DataArray = f.map((v, i) => {
        const sv = s[i];
        if (v === null || sv === null) return null;
        let pvo = 100 * (v - sv);
        pvo /= sv;
        return Number.isFinite(pvo) ? pvo : null;
    });
    const sig = toOutput(ptacEma(value, signal));
    const histogram: DataArray = value.map((v, i) => (v === null || sig[i] === null ? null : v - (sig[i] as number)));
    return { value, histogram, signal: sig };
};
