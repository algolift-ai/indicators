// packages/indicators/src/formulas/moving_averages/mmar.ts
//
// Moving Average Ribbon (Madrid): the formula, ported from pandas-ta-classic's overlap/mmar.py.
// Held to its oracle fixture, mmar.json. PURE.

import { seededEwm, toOutput } from '../../core/libmath';
import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

const RIBBONS = 6;
export const NAMES = Array.from({ length: RIBBONS }, (_, i) => `ma_${i + 1}`);

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 10);
    const step = intSetting(config.step, 5);
    const out: Record<string, DataArray> = {};
    if (period === null || step === null) {
        for (const name of NAMES) out[name] = nulls(n);
        return out;
    }
    const x = readSource(bars, config);
    NAMES.forEach((name, i) => {
        const length = period + i * step;
        out[name] = toOutput(seededEwm(x, length, 2 / (length + 1)));
    });
    return out;
};
