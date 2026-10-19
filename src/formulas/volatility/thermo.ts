// packages/indicators/src/formulas/volatility/thermo.ts
//
// Elder Market Thermometer: the formula, ported from pandas-ta-classic's volatility/thermo.py.
// Held to its oracle fixture, thermo.json. PURE.

import { column, ptacEma, toOutput } from '../../core/libmath';
import { intSetting, nulls, numSetting } from '../../core/shared';
import type { Formula } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 20);
    const open = { openMin: true };
    const longFactor = numSetting(config.long_factor, 2, 0, Infinity, open);
    const shortFactor = numSetting(config.short_factor, 0.5, 0, Infinity, open);
    if (period === null || longFactor === null || shortFactor === null) return { value: nulls(n), signal: nulls(n), long: nulls(n), short: nulls(n) };
    const high = column(bars, 'high');
    const low = column(bars, 'low');
    const thermo = high.map((h, i) => {
        if (i === 0) return NaN;
        const down = Math.abs(low[i - 1] - low[i]);
        const up = Math.abs(h - high[i - 1]);
        return up < down ? down : up;
    });
    const ma = ptacEma(thermo, period);
    // The library compares with a missing average too, and a comparison with NaN is false: 0.
    return {
        value: toOutput(thermo),
        signal: toOutput(ma),
        long: thermo.map((t, i) => (t < ma[i] * longFactor ? 1 : 0)),
        short: thermo.map((t, i) => (t > ma[i] * shortFactor ? 1 : 0)),
    };
};
