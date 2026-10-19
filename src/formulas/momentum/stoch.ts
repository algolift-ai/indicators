// packages/indicators/src/formulas/momentum/stoch.ts
//
// Stochastic: the formula of the AlgoLift strategy node indicator_stochastic, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It differs from TA-Lib's STOCH and STOCHF by a convention, stated in the catalog
// entry's provenance; its fixture, stoch.json, is this formula's own output
// (TA-Lib's is beside it, talib/stoch.json, for the comparison).
// PURE.

import { calcSMA, calcRollingMin, calcRollingMax } from '../../core/mathUtils';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const kPeriod = config.k_period || 14;
    const stochType = config.stochastic_type || 'Slow';
    const kSlowPeriod = stochType === 'Fast' ? 1 : (stochType === 'Full' ? (config.k_slow_period || 3) : 3);
    const dPeriod = config.d_period || 3;
    
    const source = data.map(d => d.close);
    const high = data.map(d => d.high);
    const low = data.map(d => d.low);
    const n = data.length;

    const rawK: DataArray = new Array(n).fill(null);
    const rollingLow = calcRollingMin(low, kPeriod);
    const rollingHigh = calcRollingMax(high, kPeriod);

    for (let i = kPeriod - 1; i < n; i++) {
        const hh = rollingHigh[i];
        const ll = rollingLow[i];
        if (hh !== null && ll !== null && (hh - ll) > 1e-9 && source[i] !== null) {
            rawK[i] = 100 * ((source[i]! - ll) / (hh - ll));
        }
    }

    const { sma: percentK } = calcSMA(rawK, kSlowPeriod);
    const { sma: percentD } = calcSMA(percentK, dPeriod);
    
    const percentJ: DataArray = new Array(n).fill(null);
    const slope: DataArray = new Array(n).fill(null);

    for (let i = 0; i < n; i++) {
        if (percentK[i] !== null && percentD[i] !== null) {
            percentJ[i] = (3 * percentK[i]!) - (2 * percentD[i]!);
        }
        if (i > 0 && percentK[i] !== null && percentK[i-1] !== null) {
            slope[i] = percentK[i]! - percentK[i-1]!;
        }
    }

    return { raw_k: rawK, percent_k: percentK, percent_d: percentD, percent_j: percentJ, slope };
};
