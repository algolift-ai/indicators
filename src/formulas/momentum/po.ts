// packages/indicators/src/formulas/momentum/po.ts
//
// Projection Oscillator: the formula, ported from pandas-ta-classic's momentum/po.py.
// Held to its oracle fixture, po.json. PURE.

import { ptacLinreg, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 14, 2);
    if (period === null) return { value: nulls(bars.length) };
    const x = readSource(bars, config);
    const lr = ptacLinreg(x, period, 'value');
    return { value: toOutput(x.map((v, i) => (lr[i] === 0 ? NaN : (100 * (v - lr[i])) / lr[i]))) };
};
