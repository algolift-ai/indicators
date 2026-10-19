// packages/indicators/src/formulas/momentum/macd.ts
//
// MACD: the formula of the AlgoLift strategy node indicator_macd, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It differs from TA-Lib's MACD by a convention, stated in the catalog
// entry's provenance; its fixture, macd.json, is this formula's own output
// (TA-Lib's is beside it, talib/macd.json, for the comparison).
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

    const { ema: fastEma } = calcEMA(values, fastPeriod);
    const { ema: slowEma } = calcEMA(values, slowPeriod);

    const n = values.length;
    const macdLine: DataArray = new Array(n).fill(null);
    
    for (let i = 0; i < n; i++) {
        if (fastEma[i] !== null && slowEma[i] !== null) {
            macdLine[i] = fastEma[i]! - slowEma[i]!;
        }
    }

    const { ema: signalLine } = calcEMA(macdLine, signalPeriod);
    
    const histogram: DataArray = new Array(n).fill(null);
    const macdSlope: DataArray = new Array(n).fill(null);
    const signalSlope: DataArray = new Array(n).fill(null);
    const histSlope: DataArray = new Array(n).fill(null);

    for (let i = 0; i < n; i++) {
        if (macdLine[i] !== null && signalLine[i] !== null) {
            histogram[i] = macdLine[i]! - signalLine[i]!;
        }
        if (i > 0) {
            if (macdLine[i] !== null && macdLine[i-1] !== null) macdSlope[i] = macdLine[i]! - macdLine[i-1]!;
            if (signalLine[i] !== null && signalLine[i-1] !== null) signalSlope[i] = signalLine[i]! - signalLine[i-1]!;
            if (histogram[i] !== null && histogram[i-1] !== null) histSlope[i] = histogram[i]! - histogram[i-1]!;
        }
    }

    return { 
        macd_line: macdLine, 
        signal_line: signalLine, 
        histogram: histogram,
        macd_line_slope: macdSlope,
        signal_line_slope: signalSlope,
        histogram_slope: histSlope
    };
};
