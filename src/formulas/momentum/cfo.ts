// packages/indicators/src/formulas/momentum/cfo.ts
//
// Chande Forecast Oscillator (CFO): the formula, ported from pandas-ta-classic's momentum/cfo.py.
// Held to its oracle fixture, cfo.json. PURE.

import { ptacLinreg, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 9, 2);
    if (period === null) return { value: nulls(bars.length) };
    const x = readSource(bars, config);
    const tsf = ptacLinreg(x, period, 'tsf');
    return { value: toOutput(x.map((v, i) => (100 * (v - tsf[i])) / v)) };
};
