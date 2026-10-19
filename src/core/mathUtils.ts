// packages/indicators/src/core/mathUtils.ts
//
// THE CLASSIC INDICATORS' ARITHMETIC, ONCE (OS-R9, 2026-10-16): the rolling
// windows, averages, deviation and true range the platform's classic
// indicators (SMA, EMA, RSI, MACD, Bollinger Bands, ATR and the rest) were
// written with, moved here unchanged from the app's
// src/lib/indicators/mathUtils.ts, which re-exports it. Every strategy node
// and chart that reads these computes through this one copy, so a change here
// changes saved strategies' numbers: never change a result. PURE.

import type { DataArray } from '../types';

export type { DataArray };

export function calcRollingMin(series: DataArray, window: number): DataArray {
    const n = series.length;
    const result: DataArray = new Array(n).fill(null);
    if (window <= 0 || window > n) return result;

    for (let i = window - 1; i < n; i++) {
        let currentMin: number | null = null;
        for (let j = i - window + 1; j <= i; j++) {
            const val = series[j];
            if (val !== null) {
                if (currentMin === null || val < currentMin) {
                    currentMin = val;
                }
            }
        }
        result[i] = currentMin;
    }
    return result;
}

export function calcRollingMax(series: DataArray, window: number): DataArray {
    const n = series.length;
    const result: DataArray = new Array(n).fill(null);
    if (window <= 0 || window > n) return result;

    for (let i = window - 1; i < n; i++) {
        let currentMax: number | null = null;
        for (let j = i - window + 1; j <= i; j++) {
            const val = series[j];
            if (val !== null) {
                if (currentMax === null || val > currentMax) {
                    currentMax = val;
                }
            }
        }
        result[i] = currentMax;
    }
    return result;
}

export function calcSMA(values: DataArray, period: number): { sma: DataArray; slope: DataArray } {
    const n = values.length;
    const sma: DataArray = new Array(n).fill(null);
    const slope: DataArray = new Array(n).fill(null);
    if (period <= 0 || period > n) return { sma, slope };

    for (let i = period - 1; i < n; i++) {
        let sum = 0.0;
        let validCount = 0;
        for (let j = i - period + 1; j <= i; j++) {
            const val = values[j];
            if (val !== null) {
                sum += val;
                validCount++;
            }
        }
        if (validCount === period) {
            sma[i] = sum / period;
        }
    }

    for (let i = 1; i < n; i++) {
        if (sma[i] !== null && sma[i - 1] !== null) {
            slope[i] = sma[i]! - sma[i - 1]!;
        }
    }

    return { sma, slope };
}

export function calcEMA(values: DataArray, period: number): { ema: DataArray; slope: DataArray } {
    const n = values.length;
    const ema: DataArray = new Array(n).fill(null);
    const slope: DataArray = new Array(n).fill(null);
    if (period <= 0 || period > n) return { ema, slope };

    const smoothingFactor = 2.0 / (period + 1);
    let firstValidSmaIndex = -1;

    for (let i = period - 1; i < n; i++) {
        let valid = true;
        let sum = 0.0;
        for (let j = i - period + 1; j <= i; j++) {
            if (values[j] === null) {
                valid = false;
                break;
            }
            sum += values[j]!;
        }
        if (valid) {
            firstValidSmaIndex = i;
            ema[i] = sum / period;
            break;
        }
    }

    if (firstValidSmaIndex !== -1) {
        for (let i = firstValidSmaIndex + 1; i < n; i++) {
            const currentVal = values[i];
            const prevEma = ema[i - 1];

            if (currentVal === null || prevEma === null) {
                ema[i] = null;
            } else {
                ema[i] = (currentVal - prevEma) * smoothingFactor + prevEma;
            }
        }
    }

    for (let i = 1; i < n; i++) {
        if (ema[i] !== null && ema[i - 1] !== null) {
            slope[i] = ema[i]! - ema[i - 1]!;
        }
    }

    return { ema, slope };
}

export function calcRMA(values: DataArray, period: number): DataArray {
    const n = values.length;
    const rma: DataArray = new Array(n).fill(null);
    if (period <= 0 || period > n) return rma;

    let firstValidSmaIndex = -1;
    for (let i = period - 1; i < n; i++) {
        let valid = true;
        let sum = 0.0;
        for (let j = i - period + 1; j <= i; j++) {
            if (values[j] === null) {
                valid = false;
                break;
            }
            sum += values[j]!;
        }
        if (valid) {
            firstValidSmaIndex = i;
            rma[i] = sum / period;
            break;
        }
    }

    if (firstValidSmaIndex !== -1) {
        for (let i = firstValidSmaIndex + 1; i < n; i++) {
            const currentVal = values[i];
            const prevRma = rma[i - 1];

            if (currentVal === null || prevRma === null) {
                rma[i] = null;
            } else {
                rma[i] = (prevRma * (period - 1) + currentVal) / period;
            }
        }
    }
    return rma;
}

export function calcWMA(values: DataArray, period: number): DataArray {
    const n = values.length;
    const wma: DataArray = new Array(n).fill(null);
    if (period <= 0 || period > n) return wma;

    const sumOfWeights = (period * (period + 1)) / 2.0;

    for (let i = period - 1; i < n; i++) {
        let weightedSum = 0.0;
        let hasNull = false;
        let weightIter = 1;
        for (let j = i - period + 1; j <= i; j++) {
            if (values[j] === null) {
                hasNull = true;
                break;
            }
            weightedSum += values[j]! * weightIter;
            weightIter++;
        }
        if (!hasNull) {
            wma[i] = weightedSum / sumOfWeights;
        }
    }
    return wma;
}

export function calcStdDev(values: DataArray, period: number): DataArray {    const n = values.length;
    const stdDev: DataArray = new Array(n).fill(null);
    if (period <= 1 || period > n) return stdDev;

    for (let i = period - 1; i < n; i++) {
        const validValues: number[] =[];
        for (let j = i - period + 1; j <= i; j++) {
            if (values[j] !== null) {
                validValues.push(values[j]!);
            }
        }
        if (validValues.length >= 2) {
            const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length;
            // Using ddof=0 to match numpy's default np.std exactly
            const variance = validValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validValues.length;
            stdDev[i] = Math.sqrt(variance);
        }
    }
    return stdDev;
}

export function calcTrueRange(high: DataArray, low: DataArray, close: DataArray): DataArray {
    const n = close.length;
    const tr: DataArray = new Array(n).fill(null);
    if (n < 1) return tr;

    if (high[0] !== null && low[0] !== null) {
        tr[0] = high[0]! - low[0]!;
    }

    for (let i = 1; i < n; i++) {
        const h = high[i];
        const l = low[i];
        const pc = close[i - 1];

        if (h !== null && l !== null && pc !== null) {
            const hl = h - l;
            const hpc = Math.abs(h - pc);
            const lpc = Math.abs(l - pc);
            tr[i] = Math.max(hl, hpc, lpc);
        }
    }
    return tr;
}