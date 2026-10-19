// packages/indicators/src/formulas/volume/mfi.ts
//
// MFI: the formula of the AlgoLift strategy node indicator_mfi, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It differs from TA-Lib's MFI by a convention, stated in the catalog
// entry's provenance; its fixture, mfi.json, is this formula's own output
// (TA-Lib's is beside it, talib/mfi.json, for the comparison).
// PURE.

import type { DataArray, Formula, Series } from '../../types';

/**
 * The node's formula exactly: its money_flow_ratio is an infinity on a bar
 * whose window had buying and no selling. The app's strategy node runs this.
 */
export const nodeCompute: Formula = (data, config) => {
    const period = config.period || 14;
    const n = data.length;
    
    const typicalPrice = data.map(d => (d.high + d.low + d.close) / 3.0);
    const rawMoneyFlow = typicalPrice.map((tp, i) => tp * data[i].volume);

    const posMoneyFlow = new Array(n).fill(0);
    const negMoneyFlow = new Array(n).fill(0);

    for (let i = 1; i < n; i++) {
        if (typicalPrice[i] > typicalPrice[i-1]) posMoneyFlow[i] = rawMoneyFlow[i];
        else if (typicalPrice[i] < typicalPrice[i-1]) negMoneyFlow[i] = rawMoneyFlow[i];
    }

    const value: DataArray = new Array(n).fill(null);
    const slope: DataArray = new Array(n).fill(null);
    const mfRatio: DataArray = new Array(n).fill(null);

    for (let i = period; i < n; i++) {
        let sumPos = 0;
        let sumNeg = 0;
        for (let j = i - period + 1; j <= i; j++) {
            sumPos += posMoneyFlow[j];
            sumNeg += negMoneyFlow[j];
        }

        if (sumNeg > 1e-9) {
            const ratio = sumPos / sumNeg;
            mfRatio[i] = ratio;
            value[i] = 100.0 - (100.0 / (1.0 + ratio));
        } else if (sumPos > 0) {
            mfRatio[i] = Infinity; // Using Infinity as a fallback
            value[i] = 100.0;
        } else {
            mfRatio[i] = 1.0;
            value[i] = 50.0;
        }
    }

    for (let i = 1; i < n; i++) {
        if (value[i] !== null && value[i-1] !== null) {
            slope[i] = value[i]! - value[i-1]!;
        }
    }

    return { value, slope, money_flow_ratio: mfRatio };
};

/**
 * Every output, one value per bar: the node's formula, with the one number
 * the package never returns (money_flow_ratio's infinity, where the window
 * had buying and no selling) written as null.
 */
export const compute: Formula = (bars, config) => {
    const out = nodeCompute(bars, config);
    const finite = (s: Series): Series => s.map((v) => (v !== null && !Number.isFinite(v) ? null : v));
    return Object.fromEntries(Object.entries(out).map(([k, s]) => [k, finite(s)]));
};
