// packages/indicators/src/formulas/momentum/seq_count.ts
//
// Sequential Setup Count: the formula, ported from pandas-ta-classic's momentum/td_seq.py.
// Held to its oracle fixture, seq_count.json. PURE.

import { nulls, readSource } from '../../core/shared';
import type { Formula } from '../../types';

/** The count holds at 13, the setup's full length. */
const CAP = 13;

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const up = nulls(n);
    const down = nulls(n);
    const x = readSource(bars, config);
    let u = 0;
    let d = 0;
    for (let i = 0; i < n; i++) {
        const change = i >= 4 ? x[i] - x[i - 4] : NaN;
        u = change > 0 ? u + 1 : 0;
        d = change < 0 ? d + 1 : 0;
        if (u > 0) up[i] = Math.min(u, CAP);
        if (d > 0) down[i] = Math.min(d, CAP);
    }
    return { up, down };
};
