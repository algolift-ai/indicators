// packages/indicators/src/formulas/regression/linreg.ts
//
// Linear Regression: the formula of the AlgoLift strategy node indicator_linear_regression, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It matches TA-Lib's LINEARREG and LINEARREG_SLOPE to the oracle's tolerance on its fixture, linreg.json
// (TA-Lib's output); the outputs TA-Lib does not compute, and the defaults,
// are listed in the catalog entry's provenance.
// PURE.

import type { DataArray, Formula, OracleTerms, SpecBar } from '../../types';

type OHLCData = SpecBar;

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const period = config.period || 14;
    const seriesType = config.series || 'close';
    const values = data.map(d => d[seriesType as keyof OHLCData] || null);
    const n = values.length;

    const regressionValue: DataArray = new Array(n).fill(null);
    const slopeOut: DataArray = new Array(n).fill(null);
    const rSquaredOut: DataArray = new Array(n).fill(null);

    if (n < period) return { value: regressionValue, slope: slopeOut, r_squared: rSquaredOut, change: new Array(n).fill(null) };

    let sumX = 0;
    let sumXSq = 0;
    for (let i = 0; i < period; i++) {
        sumX += i;
        sumXSq += i * i;
    }
    const denominator = period * sumXSq - sumX * sumX;

    for (let i = period - 1; i < n; i++) {
        let sumY = 0;
        let sumXY = 0;
        let hasNull = false;
        
        for (let j = 0; j < period; j++) {
            const val = values[i - period + 1 + j];
            if (val === null) {
                hasNull = true;
                break;
            }
            sumY += val;
            sumXY += j * val;
        }

        if (hasNull || denominator === 0) continue;

        const slope = (period * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / period;
        
        const finalValue = intercept + slope * (period - 1);
        
        regressionValue[i] = finalValue;
        slopeOut[i] = slope;

        const meanY = sumY / period;
        let ssTot = 0;
        let ssRes = 0;
        for (let j = 0; j < period; j++) {
            const val = values[i - period + 1 + j]!;
            ssTot += Math.pow(val - meanY, 2);
            const predictedY = intercept + slope * j;
            ssRes += Math.pow(val - predictedY, 2);
        }

        if (ssTot > 1e-9) {
            rSquaredOut[i] = (1 - (ssRes / ssTot)) * 100;
        } else {
            rSquaredOut[i] = 100.0;
        }
    }

    // The line's own move since the prior bar (the engine's "change").
    const changeOut: DataArray = new Array(n).fill(null);
    for (let i = 1; i < n; i++) {
        if (regressionValue[i] !== null && regressionValue[i - 1] !== null) changeOut[i] = regressionValue[i]! - regressionValue[i - 1]!;
    }

    return { value: regressionValue, slope: slopeOut, r_squared: rSquaredOut, change: changeOut };
};

/** How it meets TA-Lib's fixture: the slope near zero within 1e-11 absolute. */
export const oracle: OracleTerms = {
    atol: 1e-11,
    reason: "The slope is a difference of two large sums (n times the sum of x times y, less the sum of x times the sum of y), so near zero it keeps only a few digits of them. TA-Lib counts x back from the newest bar and this formula forward from the oldest, so the two cancel in different orders and differ by up to 3e-12 absolute where the slope is near zero; the formula keeps its order, because it is the strategy node's and its numbers never change.",
};
