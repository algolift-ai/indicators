// packages/indicators/src/formulas/cycles/ht_phasor.ts
//
// Hilbert Transform Phasor (in-phase, quadrature): the formula, ported from TA-Lib's ta_HT_PHASOR.c.
// Held to its oracle fixture, ht_phasor.json. PURE.

import { runHilbert } from '../../core/hilbert';
import { nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** TA-Lib's lookback: 12 bars to prime the price smoother, 20 more for the transforms to settle. */
const LOOKBACK = 32;
/** Bars the price smoother settles over after its first three. */
const PRIME_BARS = 9;

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const inPhase: DataArray = nulls(n);
    const quadrature: DataArray = nulls(n);
    runHilbert(
        readSource(bars, config),
        PRIME_BARS,
        (bar) => {
            if (bar.today < LOOKBACK) return;
            inPhase[bar.today] = bar.i1;
            quadrature[bar.today] = bar.q1;
        },
        () => {},
    );
    return { in_phase: inPhase, quadrature };
};
