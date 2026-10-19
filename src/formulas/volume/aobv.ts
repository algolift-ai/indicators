// packages/indicators/src/formulas/volume/aobv.ts
//
// Archer On-Balance Volume (AOBV): the formula, ported from pandas-ta-classic's volume/aobv.py.
// Held to its oracle fixture, aobv.json. PURE.

import { ptacEma, signedSeries, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

/** 1 where the series is higher than `length` bars ago, else 0 (a null on either side counts as no). */
const rising = (x: DataArray, i: number, length: number) =>
    i >= length && x[i] !== null && x[i - length] !== null && (x[i] as number) - (x[i - length] as number) > 0;
const falling = (x: DataArray, i: number, length: number) =>
    i >= length && x[i] !== null && x[i - length] !== null && (x[i] as number) - (x[i - length] as number) < 0;

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    let fast = intSetting(config.fast, 4);
    let slow = intSetting(config.slow, 12);
    const maxLookback = intSetting(config.max_lookback, 2);
    const minLookback = intSetting(config.min_lookback, 2);
    const runLength = intSetting(config.run_length, 2);
    const names = ['value', 'min', 'max', 'fast', 'slow', 'long_run', 'short_run'];
    if (fast === null || slow === null || maxLookback === null || minLookback === null || runLength === null) {
        return Object.fromEntries(names.map((k) => [k, nulls(n)]));
    }
    if (slow < fast) [fast, slow] = [slow, fast];
    const sign = signedSeries(bars.map((b) => b.close));
    const obv: number[] = [];
    let total = 0;
    for (let i = 0; i < n; i++) {
        total += sign[i] * bars[i].volume;
        obv.push(total);
    }
    const min: DataArray = nulls(n);
    const max: DataArray = nulls(n);
    for (let i = minLookback - 1; i < n; i++) min[i] = Math.min(...obv.slice(i - minLookback + 1, i + 1));
    for (let i = maxLookback - 1; i < n; i++) max[i] = Math.max(...obv.slice(i - maxLookback + 1, i + 1));
    const maf = toOutput(ptacEma(obv, fast));
    const mas = toOutput(ptacEma(obv, slow));
    const longRun: DataArray = [];
    const shortRun: DataArray = [];
    for (let i = 0; i < n; i++) {
        const up = rising(maf, i, runLength);
        const down = falling(maf, i, runLength);
        const slowMoving = falling(mas, i, runLength) || rising(mas, i, runLength);
        longRun.push(up && slowMoving ? 1 : 0);
        shortRun.push(down && slowMoving ? 1 : 0);
    }
    return { value: obv, min, max, fast: maf, slow: mas, long_run: longRun, short_run: shortRun };
};
