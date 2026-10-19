// packages/indicators/src/formulas/cycles/ht_dcphase.ts
//
// Hilbert Transform Dominant Cycle Phase: the formula, ported from TA-Lib's ta_HT_DCPHASE.c.
// Held to its oracle fixture, ht_dcphase.json. PURE.

import { HT_PHASE_LOOKBACK, htDcPhase } from '../../core/hilbert';
import { nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const phase = htDcPhase(readSource(bars, config));
    for (let i = HT_PHASE_LOOKBACK; i < n; i++) value[i] = phase[i];
    return { value };
};
