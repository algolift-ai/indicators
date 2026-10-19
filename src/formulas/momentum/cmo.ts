// packages/indicators/src/formulas/momentum/cmo.ts
//
// CMO: the formula of the AlgoLift strategy node indicator_cmo, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It differs from TA-Lib's CMO by a convention, stated in the catalog
// entry's provenance; its fixture, cmo.json, is this formula's own output
// (TA-Lib's is beside it, talib/cmo.json, for the comparison).
// PURE.

import type { DataArray, Formula, SpecBar } from '../../types';

type OHLCData = SpecBar;

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const period = config.period || 14;
    const seriesType = config.series || 'close';
    const values = data.map(d => d[seriesType as keyof OHLCData] || null);
    const n = values.length;

    const cmoValue: DataArray = new Array(n).fill(null);
    const slopeOut: DataArray = new Array(n).fill(null);
    const directionOut: DataArray = new Array(n).fill(null);

    if (n < period + 1) return { value: cmoValue, slope: slopeOut, direction: directionOut };

    const gains = new Array(n).fill(0);
    const losses = new Array(n).fill(0);

    for (let i = 1; i < n; i++) {
        if (values[i] !== null && values[i-1] !== null) {
            const delta = values[i]! - values[i-1]!;
            if (delta > 0) gains[i] = delta;
            else if (delta < 0) losses[i] = -delta;
        }
    }

    for (let i = period; i < n; i++) {
        let sumGains = 0;
        let sumLosses = 0;
        for (let j = i - period + 1; j <= i; j++) {
            sumGains += gains[j];
            sumLosses += losses[j];
        }

        const totalMove = sumGains + sumLosses;

        if (totalMove > 1e-9) {
            const cmo = 100 * ((sumGains - sumLosses) / totalMove);
            cmoValue[i] = cmo;

            if (cmo > 0) directionOut[i] = 1;
            else if (cmo < 0) directionOut[i] = -1;
            else directionOut[i] = 0;

        } else {
            cmoValue[i] = 0.0;
            directionOut[i] = 0;
        }
    }

    for (let i = 1; i < n; i++) {
        if (cmoValue[i] !== null && cmoValue[i-1] !== null) {
            slopeOut[i] = cmoValue[i]! - cmoValue[i-1]!;
        }
    }

    return { value: cmoValue, slope: slopeOut, direction: directionOut };
};
