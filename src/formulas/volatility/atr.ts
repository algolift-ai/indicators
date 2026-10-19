// packages/indicators/src/formulas/volatility/atr.ts
//
// ATR: the formula of the AlgoLift strategy node indicator_atr, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It differs from TA-Lib's ATR by a convention, stated in the catalog
// entry's provenance; its fixture, atr.json, is this formula's own output
// (TA-Lib's is beside it, talib/atr.json, for the comparison).
// PURE.

import { calcRMA, calcTrueRange } from '../../core/mathUtils';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const period = config.period || 14;
    const high = data.map(d => d.high);
    const low = data.map(d => d.low);
    const close = data.map(d => d.close);

    const tr = calcTrueRange(high, low, close);
    const atr = calcRMA(tr, period);
    const slope: DataArray = new Array(data.length).fill(null);

    for (let i = 1; i < atr.length; i++) {
        if (atr[i] !== null && atr[i-1] !== null) {
            slope[i] = atr[i]! - atr[i-1]!;
        }
    }
    
    return { atr, slope };
};
