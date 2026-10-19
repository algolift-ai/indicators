// packages/indicators/src/formulas/momentum/willr.ts
//
// Williams %R: the formula of the AlgoLift strategy node indicator_williams_r, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It differs from TA-Lib's WILLR by a convention, stated in the catalog
// entry's provenance; its fixture, willr.json, is this formula's own output
// (TA-Lib's is beside it, talib/willr.json, for the comparison).
// PURE.

import { calcRollingMin, calcRollingMax } from '../../core/mathUtils';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const period = config.period || 14;
    const high = data.map(d => d.high);
    const low = data.map(d => d.low);
    const close = data.map(d => d.close);
    const n = data.length;

    const highestHigh = calcRollingMax(high, period);
    const lowestLow = calcRollingMin(low, period);

    const value: DataArray = new Array(n).fill(null);
    const slope: DataArray = new Array(n).fill(null);

    for (let i = period - 1; i < n; i++) {
        const hh = highestHigh[i];
        const ll = lowestLow[i];
        const c = close[i];
        
        if (hh !== null && ll !== null && c !== null && (hh - ll) > 1e-9) {
            value[i] = ((hh - c) / (hh - ll)) * -100;
        }
    }

    for (let i = 1; i < n; i++) {
        if (value[i] !== null && value[i-1] !== null) {
            slope[i] = value[i]! - value[i-1]!;
        }
    }

    return { value, slope };
};
