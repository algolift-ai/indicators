// packages/indicators/src/formulas/market_structure/smc_sweep.ts
//
// Liquidity Sweep: the formula, ported from pandas-ta-classic's momentum/smc_sweep.py.
// Held to its oracle fixture, smc_sweep.json. PURE.

import { column, rollingMax, rollingMin, shift } from '../../core/libmath';
import { intSetting, nulls, numSetting, signedEvent } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 15);
    const mult = numSetting(config.wick_multiplier, 1.5, 0, Infinity, { openMin: true });
    if (period === null || mult === null) return { value: nulls(n), bull: nulls(n), bear: nulls(n) };
    // NaN before the window fills: every comparison with it is false, so those bars read 0, as the library's.
    const swingLow = shift(rollingMin(column(bars, 'low'), period), 1);
    const swingHigh = shift(rollingMax(column(bars, 'high'), period), 1);
    const bull = new Array<number>(n);
    const bear = new Array<number>(n);
    for (let i = 0; i < n; i++) {
        const { open, high, low, close } = bars[i];
        const body = Math.abs(close - open);
        const lowerWick = Math.min(open, close) - low;
        const upperWick = high - Math.max(open, close);
        bull[i] = low < swingLow[i] && close > swingLow[i] && close > open && lowerWick > body * mult ? 1 : 0;
        bear[i] = high > swingHigh[i] && close < swingHigh[i] && close < open && upperWick > body * mult ? 1 : 0;
    }
    return { value: signedEvent(bull, bear), bull, bear };
};
