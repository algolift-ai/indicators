// packages/indicators/src/formulas/momentum/coppock.ts
//
// Coppock Curve: the formula, ported from pandas-ta-classic's momentum/coppock.py.
// Held to its oracle fixture, coppock.json. PURE.

import { diff, ptacWma, shift, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const period = intSetting(config.period, 10);
    const fast = intSetting(config.fast, 11);
    const slow = intSetting(config.slow, 14);
    if (period === null || fast === null || slow === null) return { value: nulls(bars.length) };
    const x = readSource(bars, config);
    const roc = (k: number) => {
        const d = diff(x, k);
        const then = shift(x, k);
        return d.map((v, i) => (100 * v) / then[i]);
    };
    const rf = roc(fast);
    const rs = roc(slow);
    return { value: toOutput(ptacWma(rf.map((v, i) => v + rs[i]), period)) };
};
