// packages/indicators/src/formulas/momentum/ao.ts
//
// Awesome Oscillator (AO): the formula, ported from pandas-ta-classic's momentum/ao.py.
// Held to its oracle fixture, ao.json. PURE.

import { rollingMean, toOutput, zip } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    let fast = intSetting(config.fast, 5);
    let slow = intSetting(config.slow, 34);
    if (fast === null || slow === null) return { value: nulls(bars.length) };
    if (slow < fast) [fast, slow] = [slow, fast];
    const median = bars.map((b) => 0.5 * (b.high + b.low));
    return { value: toOutput(zip(rollingMean(median, fast), rollingMean(median, slow), (a, b) => a - b)) };
};
