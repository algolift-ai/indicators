// packages/indicators/src/formulas/momentum/squeeze.ts
//
// Squeeze Momentum: the formula, ported from pandas-ta-classic's momentum/squeeze.py.
// Held to its oracle fixture, squeeze.json. PURE.

import { column, diff, ptacTrueRange, rollingMean, rollingVar, type Series, toOutput } from '../../core/libmath';
import { intSetting, nulls } from '../../core/shared';
import type { Formula, OracleTerms, SpecBar } from '../../types';

/** A positive number setting, else null. */
export function positiveSetting(value: unknown, fallback: number): number | null {
    const v = value === undefined || value === null || value === '' ? fallback : Number(value);
    return Number.isFinite(v) && v > 0 ? v : null;
}

/** What the squeeze studies compute before comparing bands with channels. */
export interface SqueezeBase {
    momentum: Series;
    bbLower: Series;
    bbUpper: Series;
    /** The channel's middle and the average true range, to place a channel of any width. */
    kcBasis: Series;
    kcBand: Series;
    /** The first bar where both the bands and the channel exist. */
    start: number;
}

/** The library's bands (population standard deviation), channel (simple averages) and momentum. */
export function squeezeBase(bars: readonly SpecBar[], config: Record<string, any>): SqueezeBase | null {
    const bbPeriod = intSetting(config.bb_period, 20, 2);
    const bbMult = positiveSetting(config.bb_multiplier, 2.0);
    const kcPeriod = intSetting(config.kc_period, 20);
    const momPeriod = intSetting(config.mom_period, 12);
    const momSmooth = intSetting(config.mom_smooth, 6);
    if (bbPeriod === null || bbMult === null || kcPeriod === null || momPeriod === null || momSmooth === null) return null;
    const close = column(bars, 'close');
    const sd = rollingVar(close, bbPeriod).map(Math.sqrt);
    const mid = rollingMean(close, bbPeriod);
    const dev = sd.map((s) => bbMult * s);
    return {
        momentum: rollingMean(diff(close, momPeriod), momSmooth),
        bbLower: mid.map((m, i) => m - dev[i]),
        bbUpper: mid.map((m, i) => m + dev[i]),
        kcBasis: rollingMean(close, kcPeriod),
        kcBand: rollingMean(ptacTrueRange(bars), kcPeriod),
        start: Math.max(bbPeriod - 1, kcPeriod),
    };
}

/** 1 or 0 from the comparisons, null before the bands and the channel exist. */
export function state(flags: boolean[], start: number) {
    return toOutput(flags.map((f, i) => (i < start ? NaN : f ? 1 : 0)));
}

/** Bands inside a channel of `width` average true ranges (on), outside it (off). */
export function compare(base: SqueezeBase, width: number) {
    const on: boolean[] = [];
    const off: boolean[] = [];
    for (let i = 0; i < base.kcBasis.length; i++) {
        const lower = base.kcBasis[i] - width * base.kcBand[i];
        const upper = base.kcBasis[i] + width * base.kcBand[i];
        on.push(base.bbLower[i] > lower && base.bbUpper[i] < upper);
        off.push(base.bbLower[i] < lower && base.bbUpper[i] > upper);
    }
    return { on, off };
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const base = squeezeBase(bars, config);
    const width = positiveSetting(config.kc_multiplier, 1.5);
    if (!base || width === null) return { value: nulls(n), on: nulls(n), off: nulls(n), no: nulls(n) };
    const { on, off } = compare(base, width);
    return {
        value: toOutput(base.momentum),
        on: state(on, base.start),
        off: state(off, base.start),
        no: state(on.map((o, i) => !o && !off[i]), base.start),
    };
};

/** How it meets its oracle fixture, beyond the default comparison. */
export const oracle: OracleTerms = {
    skipLeading: (c) => Math.max(Number(c.bb_period) - 1, Number(c.kc_period)),
    reason: "pandas-ta-classic writes the squeeze states from the first bar, comparing bands and channels that do not exist yet (a comparison with NaN reads false, so 'no squeeze' reads 1); the spec writes null until both exist. The skip covers every output, so the momentum's first values go uncompared there; every later one is compared.",
};
