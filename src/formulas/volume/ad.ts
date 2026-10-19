// packages/indicators/src/formulas/volume/ad.ts
//
// Accumulation/Distribution Line: the formula of the AlgoLift strategy node indicator_ad_line, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It matches TA-Lib's AD to the oracle's tolerance on its fixture, ad.json
// (TA-Lib's output); the outputs TA-Lib does not compute, and the defaults,
// are listed in the catalog entry's provenance.
// PURE.

import { calcEMA } from '../../core/mathUtils';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const smoothingPeriod = config.smoothing_period || 10;
    const n = data.length;

    const adLine: DataArray = new Array(n).fill(null);
    const rawMoneyFlow: DataArray = new Array(n).fill(null);

    if (n === 0) return { value: adLine, smoothed_value: new Array(n).fill(null), slope: new Array(n).fill(null), raw_money_flow: rawMoneyFlow };

    for (let i = 0; i < n; i++) {
        const d = data[i];
        const hlRange = d.high - d.low;
        let mfMultiplier = 0.0;

        if (hlRange > 1e-9) {
            mfMultiplier = ((d.close - d.low) - (d.high - d.close)) / hlRange;
        }

        const mfVolume = mfMultiplier * d.volume;
        rawMoneyFlow[i] = mfVolume;

        if (i > 0 && adLine[i-1] !== null) {
            adLine[i] = adLine[i-1]! + mfVolume;
        } else {
            adLine[i] = mfVolume;
        }
    }

    let smoothedAdLine: DataArray;
    if (smoothingPeriod <= 1) {
        smoothedAdLine = [...adLine];
    } else {
        smoothedAdLine = calcEMA(adLine, smoothingPeriod).ema;
    }

    const slope: DataArray = new Array(n).fill(null);
    for (let i = 1; i < n; i++) {
        if (smoothedAdLine[i] !== null && smoothedAdLine[i-1] !== null) {
            slope[i] = smoothedAdLine[i]! - smoothedAdLine[i-1]!;
        }
    }

    return { value: adLine, smoothed_value: smoothedAdLine, slope, raw_money_flow: rawMoneyFlow };
};
