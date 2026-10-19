// packages/indicators/src/formulas/cycles/ht_sine.ts
//
// Hilbert Transform Sine Wave: the formula, ported from TA-Lib's ta_HT_SINE.c.
// Held to its oracle fixture, ht_sine.json. PURE.

import { HT_PHASE_LOOKBACK, htDcPhase } from '../../core/hilbert';
import { nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const lead: DataArray = nulls(n);
    const phase = htDcPhase(readSource(bars, config));
    const deg2Rad = 1.0 / (45.0 / Math.atan(1));
    for (let i = HT_PHASE_LOOKBACK; i < n; i++) {
        value[i] = Math.sin(phase[i] * deg2Rad);
        lead[i] = Math.sin((phase[i] + 45) * deg2Rad);
    }
    return { value, lead };
};
