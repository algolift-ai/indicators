// packages/indicators/src/formulas/momentum/tmo.ts
//
// True Momentum Oscillator (TMO): the formula, ported from pandas-ta's momentum/tmo.py.
// Held to its oracle fixture, tmo.json. PURE.

import { nans, talibEma, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 14);
    const calc = intSetting(config.calc_period, 5);
    const smooth = intSetting(config.smooth, 3);
    if (period === null || calc === null || smooth === null) return { value: nulls(n), signal: nulls(n) };
    // The signed count against the previous `period` opens (the current bar's own open excluded).
    const count = nans(n);
    for (let i = period; i < n; i++) {
        let s = 0;
        for (let j = i - period; j < i; j++) s += Math.sign(bars[i].close - bars[j].open);
        count[i] = s;
    }
    const main = talibEma(talibEma(count, calc), smooth);
    return { value: toOutput(main), signal: toOutput(talibEma(main, smooth)) };
};
