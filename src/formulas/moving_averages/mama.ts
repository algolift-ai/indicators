// packages/indicators/src/formulas/moving_averages/mama.ts
//
// MESA Adaptive Moving Average (MAMA): the formula, ported from TA-Lib's ta_MAMA.c.
// Held to its oracle fixture, mama.json. PURE.

import { runHilbert } from '../../core/hilbert';
import { nulls, numSetting, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** TA-Lib's fixed lookback: 32 bars before the first value. */
const LOOKBACK = 32;

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const signal: DataArray = nulls(n);
    const fastLimit = numSetting(config.fast_limit, 0.5, 0.01, 0.99);
    const slowLimit = numSetting(config.slow_limit, 0.05, 0.01, 0.99);
    if (fastLimit === null || slowLimit === null || n <= LOOKBACK) return { value, signal };
    const x = readSource(bars, config);
    const rad2Deg = 180.0 / (4.0 * Math.atan(1));
    let prevPhase = 0.0;
    let mama = 0.0;
    let fama = 0.0;
    runHilbert(
        x,
        9,
        ({ today, q1, i1 }) => {
            const phase = i1 !== 0.0 ? Math.atan(q1 / i1) * rad2Deg : 0.0;
            let delta = prevPhase - phase;
            prevPhase = phase;
            if (delta < 1.0) delta = 1.0;
            let alpha: number;
            if (delta > 1.0) {
                alpha = fastLimit / delta;
                if (alpha < slowLimit) alpha = slowLimit;
            } else {
                alpha = fastLimit;
            }
            mama = (1 - alpha) * mama + alpha * x[today];
            alpha *= 0.5;
            fama = (1 - alpha) * fama + alpha * mama;
            if (today >= LOOKBACK) {
                value[today] = mama;
                signal[today] = fama;
            }
        },
        () => {},
    );
    return { value, signal };
};
