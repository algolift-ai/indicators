// packages/indicators/src/formulas/momentum/roc.ts
//
// Rate of Change (ROC): the formula, ported from TA-Lib's ta_ROC.c.
// Held to its oracle fixture, roc.json. PURE.

import { intSetting, nulls, readSource } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

type RocUnit = 'percent' | 'fraction' | 'ratio' | 'ratio100';

/** Each unit's formula, written as TA-Lib writes it (the same operations in the same order). */
const UNIT: Record<RocUnit, (now: number, then: number) => number> = {
    percent: (now, then) => (now / then - 1.0) * 100.0, // ROC
    fraction: (now, then) => (now - then) / then, // ROCP
    ratio: (now, then) => now / then, // ROCR
    ratio100: (now, then) => (now / then) * 100.0, // ROCR100
};

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 10);
    if (period === null) return { value };
    const f = UNIT[config.unit as RocUnit] ?? UNIT.percent;
    const x = readSource(bars, config);
    for (let i = period; i < n; i++) {
        const then = x[i - period];
        value[i] = then !== 0 ? f(x[i], then) : 0;
    }
    return { value };
};
