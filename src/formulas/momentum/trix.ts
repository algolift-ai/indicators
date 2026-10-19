// packages/indicators/src/formulas/momentum/trix.ts
//
// TRIX: the formula of the AlgoLift strategy node indicator_trix, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It matches TA-Lib's TRIX to the oracle's tolerance on its fixture, trix.json
// (TA-Lib's output); the outputs TA-Lib does not compute, and the defaults,
// are listed in the catalog entry's provenance.
// PURE.

import { calcEMA } from '../../core/mathUtils';
import type { DataArray, Formula, SpecBar } from '../../types';

type OHLCData = SpecBar;

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const period = config.period || 15;
    const signalPeriod = config.signal_period || 9;
    const seriesType = config.series || 'close';
    const values = data.map(d => d[seriesType as keyof OHLCData] || null);
    const n = values.length;

    const trixValue: DataArray = new Array(n).fill(null);
    const histogramOut: DataArray = new Array(n).fill(null);
    const slopeOut: DataArray = new Array(n).fill(null);

    if (n < period * 3) {
        return { value: trixValue, signal_line: new Array(n).fill(null), histogram: histogramOut, slope: slopeOut };
    }

    const { ema: ema1 } = calcEMA(values, period);
    const { ema: ema2 } = calcEMA(ema1, period);
    const { ema: ema3 } = calcEMA(ema2, period);

    for (let i = 1; i < n; i++) {
        if (ema3[i] !== null && ema3[i-1] !== null && ema3[i-1] !== 0) {
            trixValue[i] = ((ema3[i]! - ema3[i-1]!) / ema3[i-1]!) * 100.0;
        }
    }

    const { ema: signalLineOut } = calcEMA(trixValue, signalPeriod);

    for (let i = 1; i < n; i++) {
        if (trixValue[i] !== null && signalLineOut[i] !== null) {
            histogramOut[i] = trixValue[i]! - signalLineOut[i]!;
        }
        if (trixValue[i] !== null && trixValue[i-1] !== null) {
            slopeOut[i] = trixValue[i]! - trixValue[i-1]!;
        }
    }

    return { value: trixValue, signal_line: signalLineOut, histogram: histogramOut, slope: slopeOut };
};
