// packages/indicators/src/formulas/cycles/ht_dcperiod.ts
//
// Hilbert Transform Dominant Cycle Period: the formula, ported from TA-Lib's ta_HT_DCPERIOD.c.
// Held to its oracle fixture, ht_dcperiod.json. PURE.

import { runHilbert } from '../../core/hilbert';
import { nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** TA-Lib's lookback: 12 bars to prime the price smoother, 20 more for the period to settle. */
const LOOKBACK = 32;
/** Bars the price smoother settles over after its first three. */
const PRIME_BARS = 9;

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    let smoothPeriod = 0.0;
    runHilbert(
        readSource(bars, config),
        PRIME_BARS,
        () => {},
        (today, period) => {
            smoothPeriod = 0.67 * smoothPeriod + 0.33 * period;
            if (today >= LOOKBACK) value[today] = smoothPeriod;
        },
    );
    return { value };
};
