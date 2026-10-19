// packages/indicators/src/formulas/trend_strength/adx.ts
//
// ADX and DMI: the formula of the AlgoLift strategy node indicator_adx_dmi, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It differs from TA-Lib's ADX, PLUS_DI, MINUS_DI and DX by a convention, stated in the catalog
// entry's provenance; its fixture, adx.json, is this formula's own output
// (TA-Lib's is beside it, talib/adx.json, for the comparison).
// PURE.

import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const period = config.period || 14;
    const adxrLookback = config.adxr_lookback || 0;
    const n = data.length;
    
    const high = data.map(d => d.high);
    const low = data.map(d => d.low);
    const close = data.map(d => d.close);

    const plusDi: DataArray = new Array(n).fill(null);
    const minusDi: DataArray = new Array(n).fill(null);
    const adx: DataArray = new Array(n).fill(null);
    const dx: DataArray = new Array(n).fill(null);
    const adxr: DataArray = new Array(n).fill(null);
    const diDiff: DataArray = new Array(n).fill(null);
    const diRatio: DataArray = new Array(n).fill(null);

    if (n < period) return { plus_di: plusDi, minus_di: minusDi, adx, dx, adxr, di_diff: diDiff, di_ratio: diRatio };

    const tr = new Array(n).fill(0);
    const plusDm = new Array(n).fill(0);
    const minusDm = new Array(n).fill(0);

    for (let i = 1; i < n; i++) {
        const hl = high[i]! - low[i]!;
        const hpc = Math.abs(high[i]! - close[i-1]!);
        const lpc = Math.abs(low[i]! - close[i-1]!);
        tr[i] = Math.max(hl, hpc, lpc);

        const moveUp = high[i]! - high[i-1]!;
        const moveDown = low[i-1]! - low[i]!;
        if (moveUp > moveDown && moveUp > 0) plusDm[i] = moveUp;
        if (moveDown > moveUp && moveDown > 0) minusDm[i] = moveDown;
    }

    let trSum = 0;
    let pDmSum = 0;
    let mDmSum = 0;

    for (let i = 1; i <= period; i++) {
        trSum += tr[i];
        pDmSum += plusDm[i];
        mDmSum += minusDm[i];
    }

    if (trSum > 0) {
        plusDi[period] = 100 * (pDmSum / trSum);
        minusDi[period] = 100 * (mDmSum / trSum);
    }

    let diSum = (plusDi[period] || 0) + (minusDi[period] || 0);
    if (diSum > 0) {
        dx[period] = 100 * (Math.abs(plusDi[period]! - minusDi[period]!) / diSum);
    }

    const dxForAdx: number[] = new Array(period).fill(0);
    dxForAdx[period-1] = dx[period] || 0;

    for (let i = period + 1; i < n; i++) {
        trSum = trSum - (trSum / period) + tr[i];
        pDmSum = pDmSum - (pDmSum / period) + plusDm[i];
        mDmSum = mDmSum - (mDmSum / period) + minusDm[i];

        if (trSum > 0) {
            plusDi[i] = 100 * (pDmSum / trSum);
            minusDi[i] = 100 * (mDmSum / trSum);
        }

        diSum = (plusDi[i] || 0) + (minusDi[i] || 0);
        if (diSum > 0) {
            dx[i] = 100 * (Math.abs(plusDi[i]! - minusDi[i]!) / diSum);
        }

        if (i === (period * 2) - 1) {
            let initialAdxSum = 0;
            let count = 0;
            for (let j = period; j <= i; j++) {
                if (dx[j] !== null) {
                    initialAdxSum += dx[j]!;
                    count++;
                }
            }
            if (count > 0) adx[i] = initialAdxSum / count;
        } else if (i > (period * 2) - 1) {
            if (adx[i-1] !== null && dx[i] !== null) {
                adx[i] = ((adx[i-1]! * (period - 1)) + dx[i]!) / period;
            }
        }
    }

    if (adxrLookback > 0) {
        for (let i = (period * 2) - 1 + adxrLookback; i < n; i++) {
            if (adx[i] !== null && adx[i - adxrLookback] !== null) {
                adxr[i] = (adx[i]! + adx[i - adxrLookback]!) / 2;
            }
        }
    }

    for (let i = period; i < n; i++) {
        if (plusDi[i] !== null && minusDi[i] !== null) {
            diDiff[i] = plusDi[i]! - minusDi[i]!;
            if (minusDi[i] !== 0) {
                diRatio[i] = plusDi[i]! / minusDi[i]!;
            }
        }
    }

    return { plus_di: plusDi, minus_di: minusDi, adx, dx, adxr, di_diff: diDiff, di_ratio: diRatio };
};
