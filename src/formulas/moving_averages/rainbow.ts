// packages/indicators/src/formulas/moving_averages/rainbow.ts
//
// Rainbow Moving Averages: the formula, ported from pandas-ta-classic's overlap/rainbow.py.
// Held to its oracle fixture, rainbow.json. PURE.

import { rollingMean, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

const RIBBONS = 10;
export const NAMES = Array.from({ length: RIBBONS }, (_, i) => `ma_${i + 1}`);

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 2);
    const out: Record<string, DataArray> = {};
    if (period === null) {
        for (const name of NAMES) out[name] = nulls(n);
        return out;
    }
    let prev: DataArray = readSource(bars, config);
    for (const name of NAMES) {
        prev = toOutput(rollingMean(prev, period));
        out[name] = prev;
    }
    return out;
};
