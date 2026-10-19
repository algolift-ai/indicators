// packages/indicators/src/formulas/moving_averages/dema.ts
//
// DEMA: the formula of the AlgoLift strategy node indicator_dema, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It matches TA-Lib's DEMA to the oracle's tolerance on its fixture, dema.json
// (TA-Lib's output); the outputs TA-Lib does not compute, and the defaults,
// are listed in the catalog entry's provenance.
// PURE.

import { calcEMA } from '../../core/mathUtils';
import type { DataArray, Formula, SpecBar } from '../../types';

type OHLCData = SpecBar;

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const period = config.period || 14;
    const seriesType = config.series || 'close';
    const values = data.map(d => d[seriesType as keyof OHLCData] || null);
    const n = values.length;

    const demaValue: DataArray = new Array(n).fill(null);
    const slopeOut: DataArray = new Array(n).fill(null);

    if (n < period * 2) return { value: demaValue, slope: slopeOut };

    const { ema: ema1 } = calcEMA(values, period);
    const { ema: ema2 } = calcEMA(ema1, period);

    for (let i = 0; i < n; i++) {
        if (ema1[i] !== null && ema2[i] !== null) {
            demaValue[i] = (2 * ema1[i]!) - ema2[i]!;
        }
    }

    for (let i = 1; i < n; i++) {
        if (demaValue[i] !== null && demaValue[i-1] !== null) {
            slopeOut[i] = demaValue[i]! - demaValue[i-1]!;
        }
    }

    return { value: demaValue, slope: slopeOut };
};
