// packages/indicators/src/formulas/volume/nvi.ts
//
// Negative Volume Index (NVI): the formula, ported from pandas-ta-classic's volume/nvi.py.
// Held to its oracle fixture, nvi.json. PURE.

import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula, SpecBar } from '../../types';

/**
 * pandas-ta-classic's volume index: `initial` on the first bar, then the
 * running sum of the close's percent change over `period` bars, counted only
 * on the bars `counts` picks (volume fell, or rose, since the bar before).
 */
export function volumeIndex(
    bars: SpecBar[],
    config: Record<string, any>,
    counts: (volume: number, previous: number) => boolean,
): DataArray {
    const n = bars.length;
    const period = intSetting(config.period, 1);
    const initial = intSetting(config.initial, 1000);
    if (period === null || initial === null || n === 0) return nulls(n);
    const out: DataArray = [initial];
    let total = initial;
    for (let i = 1; i < n; i++) {
        if (i >= period && counts(bars[i].volume, bars[i - 1].volume)) {
            const then = bars[i - period].close;
            total += (100 * (bars[i].close - then)) / then;
        }
        out.push(total);
    }
    return out;
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => ({ value: volumeIndex(bars, config, (v, prev) => v < prev) });
