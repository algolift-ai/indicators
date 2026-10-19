// packages/indicators/src/formulas/trend_strength/amat.ts
//
// Archer Moving Averages Trends (AMAT): the formula, ported from pandas-ta-classic's trend/amat.py.
// Held to its oracle fixture, amat.json. PURE.

import { ptacEma } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula, OracleTerms } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const longRun: DataArray = nulls(n);
    const shortRun: DataArray = nulls(n);
    const fast = intSetting(config.fast, 8);
    const slow = intSetting(config.slow, 21);
    const lookback = intSetting(config.lookback, 2);
    if (fast === null || slow === null || lookback === null) return { long_run: longRun, short_run: shortRun };
    const close = bars.map((b) => b.close);
    const f = ptacEma(close, fast);
    const s = ptacEma(close, slow);
    // A rise or fall over the lookback; a NaN difference is neither, as the library's comparison makes it.
    const rising = (x: number[], i: number) => x[i] - x[i - lookback] > 0;
    const falling = (x: number[], i: number) => x[i] - x[i - lookback] < 0;
    // The states exist once both averages have a value `lookback` bars back.
    for (let i = Math.max(fast, slow) - 1 + lookback; i < n; i++) {
        const fUp = rising(f, i);
        const fDown = falling(f, i);
        const sUp = rising(s, i);
        const sDown = falling(s, i);
        longRun[i] = (fUp && sDown) || (fUp && sUp) ? 1 : 0;
        shortRun[i] = (fDown && sUp) || (fDown && sDown) ? 1 : 0;
    }
    return { long_run: longRun, short_run: shortRun };
};

/** How it meets its oracle fixture, beyond the default comparison. */
export const oracle: OracleTerms = {
    skipLeading: (c) => Math.max(Number(c.fast), Number(c.slow)) - 1 + Number(c.lookback),
    reason: 'The library writes 0 (no run) on the bars before both EMAs have a value the lookback\'s bars back, because a comparison with its NaN reads false; the study writes null there, since no run can be judged yet.',
};
