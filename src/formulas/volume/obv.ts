// packages/indicators/src/formulas/volume/obv.ts
//
// OBV: the formula of the AlgoLift strategy node indicator_obv, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It differs from TA-Lib's OBV by a convention, stated in the catalog
// entry's provenance; its fixture, obv.json, is this formula's own output
// (TA-Lib's is beside it, talib/obv.json, for the comparison).
// PURE.

import { calcEMA } from '../../core/mathUtils';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const smoothingPeriod = config.smoothing_period || 10;
    const n = data.length;

    const obv: DataArray = new Array(n).fill(null);
    if (n < 2) return { value: obv, smoothed_value: new Array(n).fill(null), slope: new Array(n).fill(null) };

    obv[0] = 0; // Initialize first value

    for (let i = 1; i < n; i++) {
        const currentClose = data[i].close;
        const prevClose = data[i-1].close;
        const vol = data[i].volume;

        if (currentClose > prevClose) {
            obv[i] = obv[i-1]! + vol;
        } else if (currentClose < prevClose) {
            obv[i] = obv[i-1]! - vol;
        } else {
            obv[i] = obv[i-1]!;
        }
    }

    let smoothedObv: DataArray;
    if (smoothingPeriod <= 1) {
        smoothedObv = [...obv]; 
    } else {
        smoothedObv = calcEMA(obv, smoothingPeriod).ema;
    }

    const slope: DataArray = new Array(n).fill(null);
    for (let i = 1; i < n; i++) {
        if (smoothedObv[i] !== null && smoothedObv[i-1] !== null) {
            slope[i] = smoothedObv[i]! - smoothedObv[i-1]!;
        }
    }

    return { value: obv, smoothed_value: smoothedObv, slope };
};
