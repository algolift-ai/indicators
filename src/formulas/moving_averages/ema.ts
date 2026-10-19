// packages/indicators/src/formulas/moving_averages/ema.ts
//
// EMA: the formula of the AlgoLift strategy node indicator_ema, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It matches TA-Lib's EMA to the oracle's tolerance on its fixture, ema.json
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
    const { ema, slope } = calcEMA(values, period);
    return { value: ema, slope };
};
