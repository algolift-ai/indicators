// packages/indicators/src/formulas/momentum/uo.ts
//
// Ultimate Oscillator: the formula of the AlgoLift strategy node indicator_ultimate_oscillator, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It matches TA-Lib's ULTOSC to the oracle's tolerance on its fixture, uo.json
// (TA-Lib's output); the outputs TA-Lib does not compute, and the defaults,
// are listed in the catalog entry's provenance.
// PURE.

import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const shortPeriod = config.short_period || 7;
    const mediumPeriod = config.medium_period || 14;
    const longPeriod = config.long_period || 28;
    const n = data.length;

    const uoValue: DataArray = new Array(n).fill(null);
    const slopeOut: DataArray = new Array(n).fill(null);
    const bpOut: DataArray = new Array(n).fill(null);
    const trOut: DataArray = new Array(n).fill(null);

    if (n < longPeriod + 1) return { value: uoValue, slope: slopeOut, buying_pressure: bpOut, true_range: trOut };

    for (let i = 1; i < n; i++) {
        const trueLow = Math.min(data[i].low, data[i-1].close);
        const trueHigh = Math.max(data[i].high, data[i-1].close);
        
        bpOut[i] = data[i].close - trueLow;
        trOut[i] = trueHigh - trueLow;
    }

    for (let i = longPeriod; i < n; i++) {
        let sumBpShort = 0, sumTrShort = 0;
        for (let j = i - shortPeriod + 1; j <= i; j++) { sumBpShort += bpOut[j]!; sumTrShort += trOut[j]!; }
        
        let sumBpMedium = 0, sumTrMedium = 0;
        for (let j = i - mediumPeriod + 1; j <= i; j++) { sumBpMedium += bpOut[j]!; sumTrMedium += trOut[j]!; }
        
        let sumBpLong = 0, sumTrLong = 0;
        for (let j = i - longPeriod + 1; j <= i; j++) { sumBpLong += bpOut[j]!; sumTrLong += trOut[j]!; }

        const avgShort = sumTrShort > 1e-9 ? sumBpShort / sumTrShort : 0.0;
        const avgMedium = sumTrMedium > 1e-9 ? sumBpMedium / sumTrMedium : 0.0;
        const avgLong = sumTrLong > 1e-9 ? sumBpLong / sumTrLong : 0.0;

        uoValue[i] = 100 * ((4 * avgShort) + (2 * avgMedium) + avgLong) / 7.0;
    }

    for (let i = 1; i < n; i++) {
        if (uoValue[i] !== null && uoValue[i-1] !== null) {
            slopeOut[i] = uoValue[i]! - uoValue[i-1]!;
        }
    }

    return { value: uoValue, slope: slopeOut, buying_pressure: bpOut, true_range: trOut };
};
