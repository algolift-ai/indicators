// packages/indicators/src/formulas/momentum/dm.ts
//
// Directional Movement (+DM, -DM): the formula, ported from TA-Lib's ta_PLUS_DM.c.
// Held to its oracle fixture, dm.json. PURE.

import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const plus: DataArray = nulls(n);
    const minus: DataArray = nulls(n);
    const period = intSetting(config.period, 14);
    if (period === null) return { plus, minus };
    // One bar's movement, with TA-Lib's comparisons.
    const move = (i: number): [number, number] => {
        const up = bars[i].high - bars[i - 1].high;
        const down = bars[i - 1].low - bars[i].low;
        return [up > 0 && up > down ? up : 0, down > 0 && up < down ? down : 0];
    };
    if (period === 1) {
        for (let i = 1; i < n; i++) [plus[i], minus[i]] = move(i);
        return { plus, minus };
    }
    if (n < period) return { plus, minus };
    // The plain sum of the first period - 1 movements, then Wilder's running sum.
    let p = 0;
    let m = 0;
    for (let i = 1; i < period; i++) {
        const [up, down] = move(i);
        if (up) p += up;
        if (down) m += down;
    }
    plus[period - 1] = p;
    minus[period - 1] = m;
    for (let i = period; i < n; i++) {
        const [up, down] = move(i);
        p = up ? p - p / period + up : p - p / period;
        m = down ? m - m / period + down : m - m / period;
        plus[i] = p;
        minus[i] = m;
    }
    return { plus, minus };
};
