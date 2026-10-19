// packages/indicators/src/formulas/trend_strength/psar.ts
//
// Parabolic SAR: the formula of the AlgoLift strategy node indicator_parabolic_sar, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It differs from TA-Lib's SAR by a convention, stated in the catalog
// entry's provenance; its fixture, psar.json, is this formula's own output
// (TA-Lib's is beside it, talib/psar.json, for the comparison).
// PURE.

import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const start = config.start ?? 0.02;
    const increment = config.increment ?? 0.02;
    const maxValue = config.max_value ?? 0.20;
    const n = data.length;

    const sarValue: DataArray = new Array(n).fill(null);
    const directionOut: DataArray = new Array(n).fill(null);
    const isFlippedOut: DataArray = new Array(n).fill(null);
    const afOut: DataArray = new Array(n).fill(null);
    const epOut: DataArray = new Array(n).fill(null);

    if (n < 2) return { value: sarValue, direction: directionOut, is_flipped: isFlippedOut, acceleration_factor: afOut, extreme_point: epOut };

    const high = data.map(d => d.high);
    const low = data.map(d => d.low);

    let sar = low[0]!;
    let ep = high[0]!;
    let af = start;
    let direction = 1;

    sarValue[1] = sar;
    directionOut[1] = direction;
    afOut[1] = af;
    epOut[1] = ep;
    isFlippedOut[0] = 0;
    isFlippedOut[1] = 0;

    for (let i = 2; i < n; i++) {
        const prevDirection = direction;
        sar = sar + af * (ep - sar);

        if (direction === 1) {
            sar = Math.min(sar, low[i-1]!, i > 1 ? low[i-2]! : low[i-1]!);
        } else {
            sar = Math.max(sar, high[i-1]!, i > 1 ? high[i-2]! : high[i-1]!);
        }

        if (direction === 1) {
            if (low[i]! < sar) {
                direction = -1;
                sar = ep;
                ep = low[i]!;
                af = start;
            } else {
                if (high[i]! > ep) {
                    ep = high[i]!;
                    af = Math.min(af + increment, maxValue);
                }
            }
        } else {
            if (high[i]! > sar) {
                direction = 1;
                sar = ep;
                ep = high[i]!;
                af = start;
            } else {
                if (low[i]! < ep) {
                    ep = low[i]!;
                    af = Math.min(af + increment, maxValue);
                }
            }
        }

        isFlippedOut[i] = direction !== prevDirection ? 1 : 0;
        sarValue[i] = sar;
        directionOut[i] = direction;
        afOut[i] = af;
        epOut[i] = ep;
    }

    return { value: sarValue, direction: directionOut, is_flipped: isFlippedOut, acceleration_factor: afOut, extreme_point: epOut };
};
