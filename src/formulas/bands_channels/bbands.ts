// packages/indicators/src/formulas/bands_channels/bbands.ts
//
// Bollinger Bands: the formula of the AlgoLift strategy node indicator_bollinger_bands, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It matches TA-Lib's BBANDS to the oracle's tolerance on its fixture, bbands.json
// (TA-Lib's output); the outputs TA-Lib does not compute, and the defaults,
// are listed in the catalog entry's provenance.
// PURE.

import { calcSMA, calcStdDev } from '../../core/mathUtils';
import type { DataArray, Formula, SpecBar } from '../../types';

type OHLCData = SpecBar;

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const period = config.period || 20;
    const multiplier = config.std_dev_multiplier || 2.0;
    const seriesType = config.series || 'close';
    const values = data.map(d => d[seriesType as keyof OHLCData] || null);

    const { sma } = calcSMA(values, period);
    const stdDev = calcStdDev(values, period);

    const n = values.length;
    const upper: DataArray = new Array(n).fill(null);
    const middle: DataArray = new Array(n).fill(null);
    const lower: DataArray = new Array(n).fill(null);
    const width: DataArray = new Array(n).fill(null);
    const percentB: DataArray = new Array(n).fill(null);
    const deviation: DataArray = new Array(n).fill(null);
    const slope: DataArray = new Array(n).fill(null);

    for (let i = 0; i < n; i++) {
        if (sma[i] !== null && stdDev[i] !== null) {
            middle[i] = sma[i]!;
            upper[i] = sma[i]! + (stdDev[i]! * multiplier);
            lower[i] = sma[i]! - (stdDev[i]! * multiplier);

            const currentWidth = upper[i]! - lower[i]!;
            width[i] = currentWidth;
            deviation[i] = values[i]! - middle[i]!;

            if (currentWidth > 1e-9 && values[i] !== null) {
                percentB[i] = 100 * ((values[i]! - lower[i]!) / currentWidth);
            }

            if (i > 0 && middle[i] !== null && middle[i-1] !== null) {
                slope[i] = middle[i]! - middle[i-1]!;
            }
        }
    }

    return { upper_band: upper, middle_band: middle, lower_band: lower, width, percent_b: percentB, deviation, slope };
};
