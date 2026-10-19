// packages/indicators/src/formulas/momentum/rsi.ts
//
// RSI: the formula of the AlgoLift strategy node indicator_rsi, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It matches TA-Lib's RSI to the oracle's tolerance on its fixture, rsi.json
// (TA-Lib's output); the outputs TA-Lib does not compute, and the defaults,
// are listed in the catalog entry's provenance.
// PURE.

import type { DataArray, Formula, SpecBar } from '../../types';

type OHLCData = SpecBar;

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const period = config.period || 14;
    const seriesType = config.series || 'close';
    const values = data.map(d => d[seriesType as keyof OHLCData] || null);
    const n = values.length;

    const result: DataArray = new Array(n).fill(null);
    const slope: DataArray = new Array(n).fill(null);
    const avgWin: DataArray = new Array(n).fill(null);
    const avgLoss: DataArray = new Array(n).fill(null);

    if (n < 1) return { value: result, slope, average_win: avgWin, average_loss: avgLoss };

    const gains = new Array(n).fill(0);
    const losses = new Array(n).fill(0);

    for (let i = 1; i < n; i++) {
        if (values[i] !== null && values[i-1] !== null) {
            const diff = values[i]! - values[i-1]!;
            if (diff > 0) gains[i] = diff;
            else if (diff < 0) losses[i] = -diff;
        }
    }

    if (n >= period && period > 0) {
        let sumGain = 0;
        let sumLoss = 0;
        for (let i = 1; i <= period; i++) {
            sumGain += gains[i];
            sumLoss += losses[i];
        }

        avgWin[period] = sumGain / period;
        avgLoss[period] = sumLoss / period;

        if (avgLoss[period] !== 0) {
            const rs = avgWin[period]! / avgLoss[period]!;
            result[period] = 100.0 - (100.0 / (1.0 + rs));
        } else if (avgWin[period] === 0 && avgLoss[period] === 0) {
            result[period] = 50.0;
        } else {
            result[period] = 100.0;
        }

        for (let i = period + 1; i < n; i++) {
            if (avgWin[i-1] === null || avgLoss[i-1] === null) continue;

            avgWin[i] = (avgWin[i-1]! * (period - 1) + gains[i]) / period;
            avgLoss[i] = (avgLoss[i-1]! * (period - 1) + losses[i]) / period;

            if (avgLoss[i] !== 0) {
                const rs = avgWin[i]! / avgLoss[i]!;
                result[i] = 100.0 - (100.0 / (1.0 + rs));
            } else if (avgWin[i] === 0 && avgLoss[i] === 0) {
                result[i] = 50.0;
            } else {
                result[i] = 100.0;
            }
        }
    }

    for (let i = 1; i < n; i++) {
        if (result[i] !== null && result[i-1] !== null) {
            slope[i] = result[i]! - result[i-1]!;
        }
    }

    return { value: result, slope, average_win: avgWin, average_loss: avgLoss };
};
