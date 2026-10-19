// packages/indicators/src/formulas/volume/adosc.ts
//
// Chaikin Oscillator: the formula of the AlgoLift strategy node indicator_chaikin_oscillator, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It differs from TA-Lib's ADOSC by a convention, stated in the catalog
// entry's provenance; its fixture, adosc.json, is this formula's own output
// (TA-Lib's is beside it, talib/adosc.json, for the comparison).
// PURE.

import { calcEMA } from '../../core/mathUtils';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const fastPeriod = config.fast_period || 3;
    const slowPeriod = config.slow_period || 10;
    const n = data.length;

    const oscillatorValue: DataArray = new Array(n).fill(null);
    const slopeOut: DataArray = new Array(n).fill(null);
    const directionOut: DataArray = new Array(n).fill(null);

    if (n < Math.max(fastPeriod, slowPeriod)) {
        return { value: oscillatorValue, slope: slopeOut, direction: directionOut };
    }

    const adLine: DataArray = new Array(n).fill(null);

    for (let i = 0; i < n; i++) {
        const d = data[i];
        const hlRange = d.high - d.low;
        let mfMultiplier = 0.0;

        if (hlRange > 1e-9) {
            mfMultiplier = ((d.close - d.low) - (d.high - d.close)) / hlRange;
        }

        const mfVolume = mfMultiplier * d.volume;

        if (i > 0 && adLine[i-1] !== null) {
            adLine[i] = adLine[i-1]! + mfVolume;
        } else {
            adLine[i] = mfVolume;
        }
    }

    const { ema: emaFast } = calcEMA(adLine, fastPeriod);
    const { ema: emaSlow } = calcEMA(adLine, slowPeriod);

    for (let i = 0; i < n; i++) {
        if (emaFast[i] !== null && emaSlow[i] !== null) {
            oscillatorValue[i] = emaFast[i]! - emaSlow[i]!;
        }
    }

    for (let i = 1; i < n; i++) {
        if (oscillatorValue[i] !== null) {
            if (oscillatorValue[i]! > 0) directionOut[i] = 1;
            else if (oscillatorValue[i]! < 0) directionOut[i] = -1;
            else directionOut[i] = 0;

            if (oscillatorValue[i-1] !== null) {
                slopeOut[i] = oscillatorValue[i]! - oscillatorValue[i-1]!;
            }
        }
    }

    return { value: oscillatorValue, slope: slopeOut, direction: directionOut };
};
