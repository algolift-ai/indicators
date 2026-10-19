// packages/indicators/src/formulas/momentum/stc.ts
//
// Schaff Trend Cycle (STC): the formula, ported from pandas-ta-classic's momentum/stc.py.
// Held to its oracle fixture, stc.json. PURE.

import { nonZeroRange, ptacEma, rollingMax, rollingMin, type Series, toOutput, zip } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { Formula, OracleTerms } from '../../types';

/**
 * round(x, 8) as the library's numba-compiled loop computes it: x x 1e8
 * rounded to the nearest whole number, ties to even, then / 1e8.
 */
function round8(x: number): number {
    if (!Number.isFinite(x)) return x;
    const y = x * 1e8;
    let r = Math.floor(y);
    const frac = y - r;
    if (frac > 0.5 || (frac === 0.5 && r % 2 !== 0)) r += 1;
    return r / 1e8;
}

/**
 * One stochastic pass with the library's smoothing: where `guard` is above 0
 * the stochastic of `src` in its window, else the last one; then
 * out += factor x (stochastic - out), rounded to 8 decimals. Starts at 0.
 */
function smoothPass(src: Series, lowest: Series, range: Series, guard: Series, factor: number): Series {
    const out = new Array(src.length).fill(0);
    let stoch = 0;
    for (let i = 1; i < src.length; i++) {
        if (guard[i] > 0) stoch = 100.0 * ((src[i] - lowest[i]) / range[i]);
        out[i] = round8(out[i - 1] + factor * (stoch - out[i - 1]));
    }
    return out;
}

/** The first bar the library's stochastics stand on a full window of the MACD. */
export const firstBar = (cycle: number, slow: number) => slow - 1 + cycle - 1;

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    let fast = intSetting(config.fast, 12);
    let slow = intSetting(config.slow, 26);
    const cycle = intSetting(config.cycle, 10);
    const factor = config.factor === undefined || config.factor === '' ? 0.5 : Number(config.factor);
    if (fast === null || slow === null || cycle === null || !(factor > 0)) return { value: nulls(n), macd: nulls(n), stoch: nulls(n) };
    if (slow < fast) [fast, slow] = [slow, fast];
    const x = readSource(bars, config);
    const macd = zip(ptacEma(x, fast), ptacEma(x, slow), (a, b) => a - b);
    const lowest = rollingMin(macd, cycle);
    const pf = smoothPass(macd, lowest, nonZeroRange(rollingMax(macd, cycle), lowest), lowest, factor);
    const lowestPf = rollingMin(pf, cycle);
    const pfRange = nonZeroRange(rollingMax(pf, cycle), lowestPf);
    const pff = smoothPass(pf, lowestPf, pfRange, pfRange, factor);
    const start = firstBar(cycle, slow);
    const from = (s: Series) => toOutput(s.map((v, i) => (i < start ? NaN : v)));
    return { value: from(pff), macd: toOutput(macd), stoch: from(pf) };
};

/** How it meets its oracle fixture, beyond the default comparison. */
export const oracle: OracleTerms = {
    skipLeading: (c) => firstBar(Number(c.cycle), Math.max(Number(c.fast), Number(c.slow))),
    reason: "pandas-ta-classic's STC and its stochastic start at 0 on the first bar, before its MACD exists; the spec writes null until the first full window of the MACD and the library's own values (computed from the same zero start) after it. The skip covers every output, so the MACD's first cycle - 1 values go uncompared; every later one is compared.",
};
