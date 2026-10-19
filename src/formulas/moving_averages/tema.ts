// packages/indicators/src/formulas/moving_averages/tema.ts
//
// TEMA: the formula of the AlgoLift strategy node indicator_tema, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It matches TA-Lib's TEMA to the oracle's tolerance on its fixture, tema.json
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

    const temaValue: DataArray = new Array(n).fill(null);
    const slopeOut: DataArray = new Array(n).fill(null);

    if (n < period * 3) return { value: temaValue, slope: slopeOut };

    const { ema: ema1 } = calcEMA(values, period);
    const { ema: ema2 } = calcEMA(ema1, period);
    const { ema: ema3 } = calcEMA(ema2, period);

    for (let i = 0; i < n; i++) {
        if (ema1[i] !== null && ema2[i] !== null && ema3[i] !== null) {
            temaValue[i] = (3 * ema1[i]!) - (3 * ema2[i]!) + ema3[i]!;
        }
    }

    for (let i = 1; i < n; i++) {
        if (temaValue[i] !== null && temaValue[i-1] !== null) {
            slopeOut[i] = temaValue[i]! - temaValue[i-1]!;
        }
    }

    return { value: temaValue, slope: slopeOut };
};
