// packages/indicators/src/formulas/market_structure/cpr.ts
//
// Central Pivot Range (CPR): the formula, ported from pandas-ta-classic's trend/cpr.py.
// Held to its oracle fixture, cpr.json. PURE.

import { nulls, numSetting } from '../../core/shared';
import type { DataArray, Formula } from '../../types';

type Method = 'classic' | 'camarilla' | 'fibonacci' | 'woodie';

const LEVELS = ['tc', 'pivot', 'bc', 'r1', 'r2', 'r3', 'r4', 's1', 's2', 's3', 's4'] as const;
type Level = (typeof LEVELS)[number];
const OUTPUTS = [...LEVELS, 'width', 'width_pct', 'width_class', 'position'] as const;

/** One bar's levels from the previous bar's high, low and close; a level the method lacks is absent. */
function levels(method: Method, ph: number, pl: number, pc: number): Partial<Record<Level, number>> {
    const pivot = method === 'woodie' ? (ph + pl + 2 * pc) / 4 : (ph + pl + pc) / 3;
    const bc = (ph + pl) / 2;
    const tc = pivot - bc + pivot;
    const out: Partial<Record<Level, number>> = { tc, pivot, bc };
    const range = ph - pl;
    if (method === 'classic' || method === 'woodie') {
        out.r1 = 2 * pivot - pl;
        out.s1 = 2 * pivot - ph;
        out.r2 = pivot + (ph - pl);
        out.s2 = pivot - (ph - pl);
    }
    if (method === 'classic') {
        out.r3 = ph + 2 * (pivot - pl);
        out.s3 = pl - 2 * (ph - pivot);
        out.r4 = ph + 3 * (pivot - pl);
        out.s4 = pl - 3 * (ph - pivot);
    }
    if (method === 'camarilla') {
        out.r1 = pc + (range * 1.1) / 12;
        out.r2 = pc + (range * 1.1) / 6;
        out.r3 = pc + (range * 1.1) / 4;
        out.r4 = pc + (range * 1.1) / 2;
        out.s1 = pc - (range * 1.1) / 12;
        out.s2 = pc - (range * 1.1) / 6;
        out.s3 = pc - (range * 1.1) / 4;
        out.s4 = pc - (range * 1.1) / 2;
    }
    if (method === 'fibonacci') {
        out.r1 = pivot + range * 0.382;
        out.r2 = pivot + range * 0.618;
        out.r3 = pivot + range * 1.0;
        out.s1 = pivot - range * 0.382;
        out.s2 = pivot - range * 0.618;
        out.s3 = pivot - range * 1.0;
    }
    return out;
}

const METHODS: readonly Method[] = ['classic', 'camarilla', 'fibonacci', 'woodie'];

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const method = (METHODS as readonly string[]).includes(config.method) ? (config.method as Method) : null;
    const narrow = numSetting(config.narrow_width, 0.5, 0);
    const wide = numSetting(config.wide_width, 1.5, 0);
    const out = Object.fromEntries(OUTPUTS.map((o) => [o, nulls(n)])) as Record<(typeof OUTPUTS)[number], DataArray>;
    if (method === null || narrow === null || wide === null || n === 0) return out;
    // The first bar has no previous bar: its levels are null, its two classes 0 (as the library's).
    out.width_class[0] = 0;
    out.position[0] = 0;
    for (let i = 1; i < n; i++) {
        const p = bars[i - 1];
        const lv = levels(method, p.high, p.low, p.close);
        for (const k of LEVELS) out[k][i] = lv[k] ?? null;
        const tc = lv.tc!;
        const bc = lv.bc!;
        const width = tc - bc;
        const widthPct = (width / lv.pivot!) * 100;
        out.width[i] = width;
        out.width_pct[i] = Number.isFinite(widthPct) ? widthPct : null;
        let cls = 0;
        if (widthPct < narrow) cls = -1;
        if (widthPct > wide) cls = 1;
        out.width_class[i] = cls;
        const close = bars[i].close;
        let pos = 0;
        if (close > tc) pos = 1;
        if (close < bc) pos = -1;
        out.position[i] = pos;
    }
    return out;
};
