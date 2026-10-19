// packages/indicators/src/formulas/price_transforms/cdl_z.ts
//
// Z-Score Candles: the formula, ported from pandas-ta-classic's candles/cdl_z.py.
// Held to its oracle fixture, cdl_z.json. PURE.

import { powerSum, windowDeviations } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** statistics/zscore with its std divisor 1: each window's last value against the window's mean, in sample standard deviations. */
function rollingZ(x: readonly number[], period: number): DataArray {
    const out: DataArray = nulls(x.length);
    for (let i = period - 1; i < x.length; i++) {
        const dev = windowDeviations(x, i, period);
        const sd = Math.sqrt(powerSum(dev, 2) / (period - 1));
        // The value's own deviation is the window's last.
        const v = dev[period - 1] / sd;
        out[i] = Number.isFinite(v) ? v : null;
    }
    return out;
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 30, 2);
    if (period === null) return { open: nulls(n), high: nulls(n), low: nulls(n), close: nulls(n) };
    return {
        open: rollingZ(bars.map((b) => b.open), period),
        high: rollingZ(bars.map((b) => b.high), period),
        low: rollingZ(bars.map((b) => b.low), period),
        close: rollingZ(bars.map((b) => b.close), period),
    };
};
