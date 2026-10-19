// packages/indicators/src/formulas/momentum/ppo.ts
//
// PPO: the formula of the AlgoLift strategy node indicator_ppo, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It matches TA-Lib's PPO to the oracle's tolerance on its fixture, ppo.json
// (TA-Lib's output); the outputs TA-Lib does not compute, and the defaults,
// are listed in the catalog entry's provenance.
// PURE.

import { calcEMA } from '../../core/mathUtils';
import type { DataArray, Formula, SpecBar } from '../../types';

type OHLCData = SpecBar;

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const fastPeriod = config.fast_period || 12;
    const slowPeriod = config.slow_period || 26;
    const signalPeriod = config.signal_period || 9;
    const seriesType = config.series || 'close';
    const values = data.map(d => d[seriesType as keyof OHLCData] || null);
    const n = data.length;

    const { ema: fastEma } = calcEMA(values, fastPeriod);
    const { ema: slowEma } = calcEMA(values, slowPeriod);

    const ppoLine: DataArray = new Array(n).fill(null);
    
    for (let i = 0; i < n; i++) {
        const fast = fastEma[i];
        const slow = slowEma[i];
        if (fast !== null && slow !== null && slow > 1e-9) {
            ppoLine[i] = ((fast - slow) / slow) * 100;
        }
    }

    const { ema: signalLine } = calcEMA(ppoLine, signalPeriod);
    
    const histogram: DataArray = new Array(n).fill(null);
    const ppoSlope: DataArray = new Array(n).fill(null);
    const signalSlope: DataArray = new Array(n).fill(null);
    const histSlope: DataArray = new Array(n).fill(null);

    for (let i = 0; i < n; i++) {
        if (ppoLine[i] !== null && signalLine[i] !== null) {
            histogram[i] = ppoLine[i]! - signalLine[i]!;
        }
        if (i > 0) {
            if (ppoLine[i] !== null && ppoLine[i-1] !== null) ppoSlope[i] = ppoLine[i]! - ppoLine[i-1]!;
            if (signalLine[i] !== null && signalLine[i-1] !== null) signalSlope[i] = signalLine[i]! - signalLine[i-1]!;
            if (histogram[i] !== null && histogram[i-1] !== null) histSlope[i] = histogram[i]! - histogram[i-1]!;
        }
    }

    return { 
        ppo_line: ppoLine, 
        signal_line: signalLine, 
        histogram,
        ppo_line_slope: ppoSlope,
        signal_line_slope: signalSlope,
        histogram_slope: histSlope
    };
};
