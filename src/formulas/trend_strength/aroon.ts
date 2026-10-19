// packages/indicators/src/formulas/trend_strength/aroon.ts
//
// Aroon: the formula of the AlgoLift strategy node indicator_aroon, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It differs from TA-Lib's AROON and AROONOSC by a convention, stated in the catalog
// entry's provenance; its fixture, aroon.json, is this formula's own output
// (TA-Lib's is beside it, talib/aroon.json, for the comparison).
// PURE.

import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const period = config.period || 14;
    const n = data.length;

    const aroonUp: DataArray = new Array(n).fill(null);
    const aroonDown: DataArray = new Array(n).fill(null);
    const oscillator: DataArray = new Array(n).fill(null);
    const direction: DataArray = new Array(n).fill(null);

    if (n < period) return { aroon_up: aroonUp, aroon_down: aroonDown, oscillator, direction };

    for (let i = period - 1; i < n; i++) {
        let highestHigh = -Infinity;
        let lowestLow = Infinity;
        let highIndex = -1;
        let lowIndex = -1;

        for (let j = 0; j < period; j++) {
            const idx = i - period + 1 + j;
            const h = data[idx].high;
            const l = data[idx].low;

            if (h >= highestHigh) {
                highestHigh = h;
                highIndex = j;
            }
            if (l <= lowestLow) {
                lowestLow = l;
                lowIndex = j;
            }
        }

        const barsSinceHigh = period - 1 - highIndex;
        const barsSinceLow = period - 1 - lowIndex;

        const aUp = ((period - barsSinceHigh) / period) * 100.0;
        const aDown = ((period - barsSinceLow) / period) * 100.0;

        aroonUp[i] = aUp;
        aroonDown[i] = aDown;
        oscillator[i] = aUp - aDown;
        direction[i] = aUp > aDown ? 1 : -1;
    }

    return { aroon_up: aroonUp, aroon_down: aroonDown, oscillator, direction };
};
