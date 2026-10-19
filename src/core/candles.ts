// packages/indicators/src/core/candles.ts
//
// TA-LIB'S CANDLE MACHINERY (the 500-indicator plan, P4, 2026-10-13;
// plan/design/indicators/PORTING.md § 15). Every TA-Lib candlestick pattern
// reads the same parts of a candle and compares them with the same averaged
// settings, so they live here once, ported from TA-Lib's C at tag v0.8.1:
//
//   · the default settings table: `TA_RestoreCandleDefaultSettings` in
//     src/ta_common/ta_global.c (each setting's range type, averaging period
//     and factor), with the enums of include/ta_defs.h;
//   · the macros of src/ta_func/ta_utility.h: TA_REALBODY, TA_UPPERSHADOW,
//     TA_LOWERSHADOW, TA_HIGHLOWRANGE, TA_CANDLECOLOR, TA_CANDLERANGE,
//     TA_CANDLEAVERAGE, TA_REALBODYGAPUP / DOWN, TA_CANDLEGAPUP / DOWN, and
//     its min / max;
//   · the running totals every pattern's C keeps per setting (`CandleTotal`),
//     added and dropped in the C's own order, which is what makes a pattern
//     agree with TA-Lib on the flat bars where every total runs down to a
//     few ulps either side of zero;
//   · C99's fma, which ta_CDLMORNINGSTAR.c and four other v0.8.1 patterns
//     call, rounded once as the C rounds it.
//
// Every number here is a double, and every operation is the C's, in the C's
// order. PURE.

import type { DataArray, SpecBar } from '../types';
import { nulls } from './shared';

// --------------------------------------------------------------- the settings

/** TA_RangeType (ta_defs.h): what part of a candle a setting averages. */
export const RANGE_REAL_BODY = 0;
export const RANGE_HIGH_LOW = 1;
export const RANGE_SHADOWS = 2;
export type CandleRangeType = typeof RANGE_REAL_BODY | typeof RANGE_HIGH_LOW | typeof RANGE_SHADOWS;

/** TA_CandleSettingType (ta_defs.h), by name. */
export type CandleSettingName =
    | 'BodyLong'
    | 'BodyVeryLong'
    | 'BodyShort'
    | 'BodyDoji'
    | 'ShadowLong'
    | 'ShadowVeryLong'
    | 'ShadowShort'
    | 'ShadowVeryShort'
    | 'Near'
    | 'Far'
    | 'Equal';

export interface CandleSetting {
    rangeType: CandleRangeType;
    /** Bars averaged; 0 means "this candle's own range" (TA_CANDLEAVERAGE). */
    avgPeriod: number;
    factor: number;
}

/**
 * TA-Lib's default candle settings (ta_global.c TA_CandleDefaultSettings).
 * The oracle runs TA-Lib with these, and no spec exposes them: TA-Lib's
 * Python wrapper sets them once for the whole library, never per call.
 */
export const CANDLE_SETTINGS: Readonly<Record<CandleSettingName, CandleSetting>> = {
    // A real body is long when longer than the average of the 10 previous real bodies.
    BodyLong: { rangeType: RANGE_REAL_BODY, avgPeriod: 10, factor: 1.0 },
    // Very long: longer than 3 times that average.
    BodyVeryLong: { rangeType: RANGE_REAL_BODY, avgPeriod: 10, factor: 3.0 },
    // Short: shorter than the average of the 10 previous real bodies.
    BodyShort: { rangeType: RANGE_REAL_BODY, avgPeriod: 10, factor: 1.0 },
    // Doji-like: shorter than 10% of the average of the 10 previous high-low ranges.
    BodyDoji: { rangeType: RANGE_HIGH_LOW, avgPeriod: 10, factor: 0.1 },
    // A shadow is long when longer than this candle's own real body.
    ShadowLong: { rangeType: RANGE_REAL_BODY, avgPeriod: 0, factor: 1.0 },
    // Very long: longer than twice this candle's real body.
    ShadowVeryLong: { rangeType: RANGE_REAL_BODY, avgPeriod: 0, factor: 2.0 },
    // Short: shorter than half the average of the 10 previous candles' summed shadows.
    ShadowShort: { rangeType: RANGE_SHADOWS, avgPeriod: 10, factor: 1.0 },
    // Very short: shorter than 10% of the average of the 10 previous high-low ranges.
    ShadowVeryShort: { rangeType: RANGE_HIGH_LOW, avgPeriod: 10, factor: 0.1 },
    // Near: within 20% of the average of the 5 previous high-low ranges.
    Near: { rangeType: RANGE_HIGH_LOW, avgPeriod: 5, factor: 0.2 },
    // Far: at least 60% of that average.
    Far: { rangeType: RANGE_HIGH_LOW, avgPeriod: 5, factor: 0.6 },
    // Equal: within 5% of that average.
    Equal: { rangeType: RANGE_HIGH_LOW, avgPeriod: 5, factor: 0.05 },
};

/** A setting's averaging period (the `<Setting>_avgPeriod` every C function reads). */
export function avgPeriod(setting: CandleSettingName): number {
    return CANDLE_SETTINGS[setting].avgPeriod;
}

/**
 * The largest averaging period of `settings`: most `TA_CDL<NAME>_Lookback`
 * functions are this plus the bars the pattern reaches back (0 for one
 * candle, 1 for two, 2 for three). Read each pattern's own `_Lookback`:
 * some add more, some (Engulfing) are a constant.
 */
export function maxAvgPeriod(...settings: CandleSettingName[]): number {
    let m = 0;
    for (const s of settings) m = cmax(m, avgPeriod(s));
    return m;
}

// ------------------------------------------------------------ the C's helpers

/** ta_utility.h `min(a, b)`: `((a) < (b)) ? (a) : (b)`. */
export function cmin(a: number, b: number): number {
    return a < b ? a : b;
}

/** ta_utility.h `max(a, b)`: `((a) > (b)) ? (a) : (b)`. */
export function cmax(a: number, b: number): number {
    return a > b ? a : b;
}

// ---------------------------------------------------------- the candle's parts

/** TA_REALBODY: |close - open|. */
export function realBody(b: SpecBar): number {
    return Math.abs(b.close - b.open);
}

/** TA_UPPERSHADOW: high minus the top of the body (the close on a white candle). */
export function upperShadow(b: SpecBar): number {
    return b.high - (b.close >= b.open ? b.close : b.open);
}

/** TA_LOWERSHADOW: the bottom of the body minus the low. */
export function lowerShadow(b: SpecBar): number {
    return (b.close >= b.open ? b.open : b.close) - b.low;
}

/** TA_HIGHLOWRANGE: high - low. */
export function highLowRange(b: SpecBar): number {
    return b.high - b.low;
}

/** TA_CANDLECOLOR: 1 for a white candle (close >= open, a doji counts as white), -1 for a black one. */
export function candleColor(b: SpecBar): 1 | -1 {
    return b.close >= b.open ? 1 : -1;
}

/** TA_CANDLERANGE: the part of the candle a setting measures. */
export function candleRange(setting: CandleSettingName, b: SpecBar): number {
    const t = CANDLE_SETTINGS[setting].rangeType;
    return t === RANGE_REAL_BODY ? realBody(b) : t === RANGE_HIGH_LOW ? highLowRange(b) : t === RANGE_SHADOWS ? upperShadow(b) + lowerShadow(b) : 0;
}

/**
 * TA_CANDLEAVERAGE: `factor * (sum / avgPeriod) / divisor`, evaluated left
 * to right as the C does; with an averaging period of 0, this candle's own
 * range stands for the average. The shadows' sum is halved (two shadows).
 */
export function candleAverage(setting: CandleSettingName, sum: number, b: SpecBar): number {
    const s = CANDLE_SETTINGS[setting];
    return (s.factor * (s.avgPeriod !== 0.0 ? sum / s.avgPeriod : candleRange(setting, b))) / (s.rangeType === RANGE_SHADOWS ? 2.0 : 1.0);
}

// --------------------------------------------------------------------- the gaps

/** TA_REALBODYGAPUP(idx2, idx1): candle 2's body sits wholly above candle 1's. */
export function realBodyGapUp(b2: SpecBar, b1: SpecBar): boolean {
    return cmin(b2.open, b2.close) > cmax(b1.open, b1.close);
}

/** TA_REALBODYGAPDOWN(idx2, idx1): candle 2's body sits wholly below candle 1's. */
export function realBodyGapDown(b2: SpecBar, b1: SpecBar): boolean {
    return cmax(b2.open, b2.close) < cmin(b1.open, b1.close);
}

/** TA_CANDLEGAPUP(idx2, idx1): candle 2's low is above candle 1's high. */
export function candleGapUp(b2: SpecBar, b1: SpecBar): boolean {
    return b2.low > b1.high;
}

/** TA_CANDLEGAPDOWN(idx2, idx1): candle 2's high is below candle 1's low. */
export function candleGapDown(b2: SpecBar, b1: SpecBar): boolean {
    return b2.high < b1.low;
}

// ------------------------------------------------------------ the running totals

/**
 * One `<Setting>PeriodTotal` of a pattern's C: the sum of a setting's range
 * over the `avgPeriod` bars before the bar it is read at, kept as a running
 * total exactly as the C keeps it.
 *
 * - `new CandleTotal(bars, setting, end)` sums bars [end - avgPeriod, end)
 *   in index order, as the C's `while( i < end )` loop does. `end` is the
 *   first bar the total is read at: `startIdx` for the current candle,
 *   `startIdx - 1` for the candle before it (the C's `i - 1` totals), and so on.
 * - `average(j)` is TA_CANDLEAVERAGE(setting, total, j).
 * - `advance(j)` moves the window past bar j, the bar just read:
 *   `total += range(j) - range(trailing)` (the difference first, then the
 *   add, as the C writes it), then the trailing index steps on.
 *
 * Read each pattern's C for which bar each total follows; a C array of
 * totals (`BodyPeriodTotal[3]` read at i - 2, i - 1, i) is one CandleTotal
 * per element.
 */
export class CandleTotal {
    total = 0;
    private trailing: number;

    constructor(
        private readonly bars: readonly SpecBar[],
        readonly setting: CandleSettingName,
        end: number,
    ) {
        this.trailing = end - avgPeriod(setting);
        // The bounds only matter with fewer bars than the lookback, where the
        // pattern's loop never runs and the total is never read.
        for (let i = cmax(this.trailing, 0); i < cmin(end, bars.length); i++) this.total += candleRange(setting, bars[i]);
    }

    /** TA_CANDLEAVERAGE(setting, total, j). */
    average(j: number): number {
        return candleAverage(this.setting, this.total, this.bars[j]);
    }

    /** `total += TA_CANDLERANGE(setting, j) - TA_CANDLERANGE(setting, trailing); trailing += 1`. */
    advance(j: number): void {
        this.total += candleRange(this.setting, this.bars[j]) - candleRange(this.setting, this.bars[this.trailing]);
        this.trailing += 1;
    }
}

// ------------------------------------------------------------------- the output

/**
 * A pattern's output frame: null for the first `lookback` bars (TA-Lib's
 * `TA_CDL<NAME>_Lookback`, where the C writes nothing), 0 after, and the
 * first bar the pattern is judged at. `start` is `bars.length` when there
 * are too few bars, so a pattern's loop then never runs.
 */
export function patternFrame(n: number, lookback: number): { value: DataArray; start: number } {
    const value: DataArray = nulls(n);
    for (let i = lookback; i < n; i++) value[i] = 0;
    return { value, start: cmin(lookback, n) };
}

// --------------------------------------------------------------------- the fma

const VIEW = new DataView(new ArrayBuffer(8));

/** A finite, non-zero double as mantissa x 2^exponent, the mantissa a signed BigInt. */
function decompose(x: number): { m: bigint; e: number } {
    VIEW.setFloat64(0, x);
    const hi = VIEW.getUint32(0);
    const lo = VIEW.getUint32(4);
    const neg = hi >>> 31 === 1;
    const expBits = (hi >>> 20) & 0x7ff;
    const frac = (BigInt(hi & 0xfffff) << BigInt(32)) | BigInt(lo);
    const m = expBits === 0 ? frac : frac | (BigInt(1) << BigInt(52));
    const e = (expBits === 0 ? 1 : expBits) - 1075;
    return { m: neg ? -m : m, e };
}

/** 2^k for an integer k in [-1022, 1023], built from its bits (exact). */
function pow2(k: number): number {
    VIEW.setUint32(0, ((k + 1023) << 20) >>> 0);
    VIEW.setUint32(4, 0);
    return VIEW.getFloat64(0);
}

/** x * 2^k for an integer k, exactly when the result is a normal double. */
function scale2(x: number, k: number): number {
    // Two steps keep each power of two representable.
    const h = Math.trunc(k / 2);
    return x * pow2(h) * pow2(k - h);
}

/**
 * C99 `fma(a, b, c)`: a * b + c rounded once (to nearest, ties to even), as
 * ta_CDLMORNINGSTAR.c, ta_CDLMORNINGDOJISTAR.c, ta_CDLABANDONEDBABY.c,
 * ta_CDLPIERCING.c and ta_CDLTHRUSTING.c compute their penetration levels.
 * `a * b + c` in JavaScript rounds twice and can land one ulp away, which
 * flips a comparison against a price that sits on the level.
 *
 * Exact through BigInt: the product and the sum are integers times one
 * power of two, and `Number(BigInt)` rounds to nearest, ties to even. The
 * mantissa is first cut to 64 significant bits with a sticky bit, so that
 * one rounding is the only one. Non-finite or zero operands take the plain
 * expression (no second rounding can happen there).
 */
export function fma(a: number, b: number, c: number): number {
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || a === 0 || b === 0) return a * b + c;
    const pa = decompose(a);
    const pb = decompose(b);
    let m = pa.m * pb.m;
    let e = pa.e + pb.e;
    if (c !== 0) {
        const pc = decompose(c);
        if (pc.e >= e) {
            m = m + (pc.m << BigInt(pc.e - e));
        } else {
            // Bring the product down to c's exponent: exact, a left shift.
            m = (m << BigInt(e - pc.e)) + pc.m;
            e = pc.e;
        }
    }
    if (m === BigInt(0)) return 0;
    // Keep 64 significant bits plus a sticky bit, so Number() rounds once, correctly.
    const neg = m < BigInt(0);
    let mag = neg ? -m : m;
    const bitLen = mag.toString(2).length;
    if (bitLen > 64) {
        const drop = bitLen - 64;
        const sticky = (mag & ((BigInt(1) << BigInt(drop)) - BigInt(1))) !== BigInt(0);
        mag = ((mag >> BigInt(drop)) << BigInt(1)) | (sticky ? BigInt(1) : BigInt(0));
        e += drop - 1;
    }
    const r = scale2(Number(mag), e);
    return neg ? -r : r;
}
