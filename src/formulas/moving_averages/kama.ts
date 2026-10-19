// packages/indicators/src/formulas/moving_averages/kama.ts
//
// KAMA: the formula of the AlgoLift strategy node indicator_kama, written for
// the platform and moved here unchanged (OS-R9, 2026-10-16), so the node, the
// chart and this package compute one copy. Never change a number: saved
// strategies and the engine run on it.
// It differs from TA-Lib's KAMA by a convention, stated in the catalog
// entry's provenance; its fixture, kama.json, is this formula's own output
// (TA-Lib's is beside it, talib/kama.json, for the comparison).
// PURE.

import type { DataArray, Formula, SpecBar } from '../../types';

type OHLCData = SpecBar;

/** Every output, one value per bar. */
export const compute: Formula = (data, config) => {
    const period = config.period || 10;
    const fastPeriod = config.fast_period || 2;
    const slowPeriod = config.slow_period || 30;
    const seriesType = config.series || 'close';
    const values = data.map(d => d[seriesType as keyof OHLCData] || null);
    const n = values.length;

    const kamaValue: DataArray = new Array(n).fill(null);
    const slopeOut: DataArray = new Array(n).fill(null);
    const erOut: DataArray = new Array(n).fill(null);

    if (n < period) return { value: kamaValue, slope: slopeOut, efficiency_ratio: erOut };

    const fastSc = 2.0 / (fastPeriod + 1.0);
    const slowSc = 2.0 / (slowPeriod + 1.0);
    let prevKama: number | null = null;

    for (let i = period; i < n; i++) {
        const currentVal = values[i];
        const oldVal = values[i - period];

        if (currentVal !== null && oldVal !== null) {
            const change = Math.abs(currentVal - oldVal);
            let volatility = 0.0;
            let validVol = true;

            for (let j = i - period + 1; j <= i; j++) {
                if (values[j] !== null && values[j-1] !== null) {
                    volatility += Math.abs(values[j]! - values[j-1]!);
                } else {
                    validVol = false;
                    break;
                }
            }

            if (validVol) {
                const er = volatility === 0 ? 0 : change / volatility;
                erOut[i] = er;

                const sc = Math.pow((er * (fastSc - slowSc) + slowSc), 2);

                if (prevKama === null) {
                    let sum = 0;
                    let count = 0;
                    for (let k = i - period; k < i; k++) {
                        if (values[k] !== null) {
                            sum += values[k]!;
                            count++;
                        }
                    }
                    prevKama = count > 0 ? sum / count : currentVal;
                }

                if (prevKama !== null) {
                    kamaValue[i] = prevKama + sc * (currentVal - prevKama);
                    prevKama = kamaValue[i];
                }
            }
        }
    }

    for (let i = 1; i < n; i++) {
        if (kamaValue[i] !== null && kamaValue[i-1] !== null) {
            slopeOut[i] = kamaValue[i]! - kamaValue[i-1]!;
        }
    }

    return { value: kamaValue, slope: slopeOut, efficiency_ratio: erOut };
};
