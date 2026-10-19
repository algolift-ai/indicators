// packages/indicators/src/formulas/momentum/cci.ts
//
// CCI: the formula of the AlgoLift strategy node indicator_cci, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It matches TA-Lib's CCI to the oracle's tolerance on its fixture, cci.json
// (TA-Lib's output); the outputs TA-Lib does not compute, and the defaults,
// are listed in the catalog entry's provenance.
// PURE.

import { calcSMA } from '../../core/mathUtils';
import type { DataArray, Formula, SpecBar } from '../../types';

type OHLCData = SpecBar;

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const period = config.period || 20;
    const constant = config.constant ?? 0.015;
    const seriesType = config.series || 'hlc3'; 
    
    const values = data.map(d => {
        if (seriesType === 'hlc3') return (d.high + d.low + d.close) / 3.0;
        if (seriesType === 'hl2') return (d.high + d.low) / 2.0;
        if (seriesType === 'ohlc4') return (d.open + d.high + d.low + d.close) / 4.0;
        return d[seriesType as keyof OHLCData] || null;
    });
    
    const n = values.length;
    const { sma } = calcSMA(values, period);

    const cciValue: DataArray = new Array(n).fill(null);
    const cciSlope: DataArray = new Array(n).fill(null);
    const meanDev: DataArray = new Array(n).fill(null);

    for (let i = period - 1; i < n; i++) {
        if (sma[i] !== null) {
            let absDiffSum = 0.0;
            let validCount = 0;
            for (let j = i - period + 1; j <= i; j++) {
                const val = values[j];
                if (val !== null) {
                    absDiffSum += Math.abs(val - sma[i]!);
                    validCount++;
                }
            }
            
            if (validCount === period) {
                const meanDeviation = absDiffSum / period;
                meanDev[i] = meanDeviation;

                const denominator = constant * meanDeviation;
                if (denominator > 1e-9 && values[i] !== null) {
                    cciValue[i] = (values[i]! - sma[i]!) / denominator;
                } else {
                    cciValue[i] = 0.0;
                }
            }
        }
    }

    for (let i = 1; i < n; i++) {
        if (cciValue[i] !== null && cciValue[i-1] !== null) {
            cciSlope[i] = cciValue[i]! - cciValue[i-1]!;
        }
    }

    return { value: cciValue, slope: cciSlope, mean_deviation: meanDev };
};
