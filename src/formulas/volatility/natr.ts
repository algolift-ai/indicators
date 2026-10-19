// packages/indicators/src/formulas/volatility/natr.ts
//
// Normalized ATR (NATR): the formula, ported from TA-Lib's ta_NATR.c.
// Held to its oracle fixture, natr.json. PURE.

import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 14, 2);
    if (period === null || n <= period) return { value };
    // The true range from bar 1 on, in TA-Lib's order of comparison.
    const tr = (i: number): number => {
        const prevClose = bars[i - 1].close;
        let greatest = bars[i].high - bars[i].low;
        const toHigh = Math.abs(prevClose - bars[i].high);
        if (toHigh > greatest) greatest = toHigh;
        const toLow = Math.abs(prevClose - bars[i].low);
        if (toLow > greatest) greatest = toLow;
        return greatest;
    };
    const pct = (atr: number, close: number) => (close !== 0 ? (atr / close) * 100.0 : 0);
    // Seeded with the plain mean of the first `period` true ranges, then Wilder's smoothing.
    let total = 0;
    for (let i = 1; i <= period; i++) total += tr(i);
    let atr = total / period;
    value[period] = pct(atr, bars[period].close);
    const beta = (period - 1) / period;
    const alpha = 1.0 - beta;
    for (let i = period + 1; i < n; i++) {
        atr = beta * atr + alpha * tr(i);
        value[i] = pct(atr, bars[i].close);
    }
    return { value };
};
