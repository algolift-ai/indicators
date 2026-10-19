// packages/indicators/src/formulas/statistics/stderr.ts
//
// Standard Error: the formula, ported from pandas-ta-classic's statistics/stderr.py.
// Held to its oracle fixture, stderr.json. PURE.

import { windowVariance } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula, OracleTerms } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 14, 2);
    if (period === null) return { value };
    const x = readSource(bars, config);
    const root = Math.sqrt(period);
    for (let i = period - 1; i < n; i++) value[i] = Math.sqrt(windowVariance(x, i, period, 1)) / root;
    return { value };
};

/** How it meets its oracle fixture, beyond the default comparison. */
export const oracle: OracleTerms = {
    rtol: 1e-7,
    reason:
        'The library calls pandas\' Series.rolling(n).std, which updates the window by adding and removing one value at a time; its rounding reaches 3.6e-8 relative where the spread is tiny next to the level (bar 211 at period 14, a window mostly on the flat bars 200 to 214). The spec computes each window directly and is within 4e-16 of the exact value on every fixture bar (checked with exact rational arithmetic), so the gap is pandas\' error, not the spec\'s.',
};
