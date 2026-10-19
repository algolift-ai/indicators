// packages/indicators/src/formulas/market_structure/zigzag.ts
//
// ZigZag: the formula, ported from pandas-ta's trend/zigzag.py.
// Held to its oracle fixture, zigzag.json. PURE.

import { intSetting, nulls, numSetting } from '../../core/shared';
import type { DataArray, Formula, SpecBar } from '../../types';

/** The swing points, in the library's arrays: bar index, 1 top or -1 bottom, price, leg in percent. */
interface Points {
    idx: number[];
    swing: number[];
    value: number[];
    dev: number[];
}

/**
 * Every bar whose low is the lowest (a bottom) or whose high is the highest
 * (a top) of the window floor(legs / 2) bars either side of it, in bar order,
 * a bottom before a top on the same bar. The last bar never enters a window
 * (the library's loop stops one bar short).
 */
function rollingSwings(bars: readonly SpecBar[], legs: number): Points {
    const out: Points = { idx: [], swing: [], value: [], dev: [] };
    const left = Math.floor(legs / 2);
    const right = left + 1;
    for (let i = left; i < bars.length - right; i++) {
        const lo = bars[i].low;
        const hi = bars[i].high;
        let isLow = true;
        let isHigh = true;
        for (let j = i - left; j < i + right; j++) {
            if (!(lo <= bars[j].low)) isLow = false;
            if (!(hi >= bars[j].high)) isHigh = false;
        }
        if (isLow) {
            out.idx.push(i);
            out.swing.push(-1);
            out.value.push(lo);
        }
        if (isHigh) {
            out.idx.push(i);
            out.swing.push(1);
            out.value.push(hi);
        }
    }
    return out;
}

/** The library's `nb_find_zz`: the zigzag found from the latest swing back, unsigned legs. */
function findZigzag(p: Points, deviation: number): Points {
    const m = p.idx.length;
    const zi = [p.idx[m - 1]];
    const zs = [p.swing[m - 1]];
    const zv = [p.value[m - 1]];
    const zd = [0];
    let z = 0;
    for (let i = m - 2; i >= 0; i--) {
        if (zs[z] === -1) {
            if (p.swing[i] === -1) {
                if (p.value[i] < zv[z] && z > 1) {
                    const cur = (zv[z - 1] - p.value[i]) / p.value[i];
                    zi[z] = p.idx[i];
                    zs[z] = p.swing[i];
                    zv[z] = p.value[i];
                    zd[z - 1] = 100 * cur;
                }
            } else {
                const cur = (p.value[i] - zv[z]) / p.value[i];
                if (cur > 0.01 * deviation) {
                    if (zi[z] === p.idx[i]) continue;
                    z += 1;
                    zi[z] = p.idx[i];
                    zs[z] = p.swing[i];
                    zv[z] = p.value[i];
                    zd[z] = 0;
                    zd[z - 1] = 100 * cur;
                }
            }
        } else if (p.swing[i] === 1) {
            if (p.value[i] > zv[z] && z > 1) {
                const cur = (p.value[i] - zv[z - 1]) / p.value[i];
                zi[z] = p.idx[i];
                zs[z] = p.swing[i];
                zv[z] = p.value[i];
                zd[z - 1] = 100 * cur;
            }
        } else {
            const cur = (zv[z] - p.value[i]) / p.value[i];
            if (cur > 0.01 * deviation) {
                if (zi[z] === p.idx[i]) continue;
                z += 1;
                zi[z] = p.idx[i];
                zs[z] = p.swing[i];
                zv[z] = p.value[i];
                zd[z] = 0;
                zd[z - 1] = 100 * cur;
            }
        }
    }
    return { idx: zi, swing: zs, value: zv, dev: zd };
}

/** The library's `nb_zz_backtest`: the zigzag walked forward, every new extreme kept as a point, signed legs. */
function detectZigzag(p: Points, deviation: number): Points {
    const m = p.idx.length;
    const zi = [p.idx[0]];
    const zs = [p.swing[0]];
    const zv = [p.value[0]];
    const zd = [0];
    let z = 0;
    let changes = 0;
    const add = (i: number, cur: number) => {
        z += 1;
        zi[z] = p.idx[i];
        zs[z] = p.swing[i];
        zv[z] = p.value[i];
        zd[z] = 100 * cur;
    };
    for (let i = 1; i < m; i++) {
        const cur = (p.value[i] - zv[z]) / zv[z];
        if (zs[z - changes] === -1) {
            if (p.swing[i] === -1) {
                if (p.value[i] < zv[z]) {
                    if (zi[z - changes] === p.idx[i]) continue;
                    add(i, cur);
                    changes += 1;
                }
            } else if (cur > 0.01 * deviation) {
                if (zi[z - changes] === p.idx[i]) continue;
                add(i, cur);
                changes = 0;
            }
        } else if (p.swing[i] === 1) {
            if (p.value[i] > zv[z]) {
                if (zi[z - changes] === p.idx[i]) continue;
                add(i, cur);
                changes += 1;
            }
        } else if (cur < -0.01 * deviation) {
            if (zi[z - changes] === p.idx[i]) continue;
            add(i, cur);
            changes = 0;
        }
    }
    return { idx: zi, swing: zs, value: zv, dev: zd };
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const swing: DataArray = nulls(n);
    const legPercent: DataArray = nulls(n);
    const legs = intSetting(config.legs, 10, 1);
    const deviation = numSetting(config.deviation, 5, 0, Infinity, { openMin: true });
    const detected = config.mode === 'detected';
    if (legs === null || deviation === null || n < legs + 1) return { value, swing, leg_percent: legPercent };
    const swings = rollingSwings(bars, legs);
    if (swings.idx.length === 0) return { value, swing, leg_percent: legPercent };
    const zz = detected ? detectZigzag(swings, deviation) : findZigzag(swings, deviation);
    // Detected points move forward to the bar the swing was confirmed on, floor(legs / 2) later.
    const lag = detected ? Math.floor(legs / 2) : 0;
    for (let j = 0; j < zz.idx.length; j++) {
        const i = zz.idx[j] + lag;
        if (i >= n) continue;
        value[i] = zz.value[j];
        swing[i] = zz.swing[j];
        legPercent[i] = zz.dev[j];
    }
    return { value, swing, leg_percent: legPercent };
};
