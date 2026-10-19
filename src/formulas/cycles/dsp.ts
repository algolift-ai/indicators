// packages/indicators/src/formulas/cycles/dsp.ts
//
// Detrended Synthetic Price: the formula, ported from pandas-ta-classic's cycles/dsp.py.
// Held to its oracle fixture, dsp.json. PURE.

import { ptacEma, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 14);
    if (period === null) return { value: nulls(n) };
    const x = readSource(bars, config);
    const ema = ptacEma(x, period);
    return { value: toOutput(x.map((v, i) => v - ema[i])) };
};
