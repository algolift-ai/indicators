// packages/indicators/src/core/libmath.ts
//
// THE LIBRARIES' ARITHMETIC, ONCE (the 500-indicator plan, P2, 2026-10-13;
// plan/design/indicators/PORTING.md § 5). Most ports come from
// pandas-ta-classic and pandas-ta, whose formulas are chains of pandas and
// numpy operations. These are those operations, each written the way the
// library's own engine computes it, so a chain gives the library's number on
// the oracle's bars, including the flat bars where a window has no range.
// Merged from the first five family sessions' helpers (momentum's _ops,
// volume's common, statistics' numpyWindow, trend strength's series, moving
// averages' kit), keeping the most faithful version of each.
//
//   · a Series is a plain array with NaN for "no value" (pandas' NaN);
//     `toOutput` turns NaN and an infinity into null at the end, `fromOutput`
//     the other way;
//   · numpy sums follow numpy's pairwise summation (`npSum`);
//   · rolling sums and means follow pandas' online, compensated window;
//   · ewm follows pandas' adjust=False recursion, NaN handling included.
//
// Inputs may hold null for "no value" (read as NaN) where a function says so.
// A new operation goes here, never into a family folder. PURE.

import type { DataArray, SpecBar } from '../types';

export type Series = number[];

const isNum = (v: number) => v === v;

// --------------------------------------------------------------- series basics

/** The bars' column as a series (a price or the volume; order flow, which can be null, reads through order_flow/_local.ts). */
export function column(bars: readonly SpecBar[], key: 'open' | 'high' | 'low' | 'close' | 'volume'): Series {
    return bars.map((b) => b[key]);
}

/** A series of NaN. */
export function nans(n: number): Series {
    return new Array(n).fill(NaN);
}

/** The output form: NaN and an infinity read as null. */
export function toOutput(x: readonly number[]): DataArray {
    return x.map((v) => (Number.isFinite(v) ? v : null));
}

/** An output (null for "no value") as a series (NaN). */
export function fromOutput(x: readonly (number | null)[]): Series {
    return x.map((v) => (v === null ? NaN : v));
}

/** pandas `x.diff(k)`. */
export function diff(x: Series, k = 1): Series {
    return x.map((v, i) => (i >= k ? v - x[i - k] : NaN));
}

/** pandas `x.shift(k)`. */
export function shift(x: Series, k: number): Series {
    return x.map((_, i) => (i >= k ? x[i - k] : NaN));
}

/** Elementwise, NaN where either side is NaN (pandas' arithmetic). */
export function zip(a: Series, b: Series, f: (x: number, y: number) => number): Series {
    return a.map((v, i) => f(v, b[i]));
}

/** Python's sys.float_info.epsilon, which the pandas libraries put in place of a zero range. */
export const EPSILON = 2.220446049250313e-16;

/** pandas-ta-classic `non_zero_range`: a - b, with EPSILON where it is exactly 0. */
export function nonZeroRange(a: Series, b: Series): Series {
    return a.map((v, i) => {
        const d = v - b[i];
        return d !== 0 ? d : EPSILON;
    });
}

/**
 * pandas-ta-classic's `signed_series(x, 1)`: 1 on the first bar, then 1, -1
 * or 0 as the value rose, fell or held since the bar before.
 */
export function signedSeries(x: readonly number[]): number[] {
    return x.map((v, i) => (i === 0 ? 1 : v > x[i - 1] ? 1 : v < x[i - 1] ? -1 : 0));
}

// ------------------------------------------------------------------ numpy sums

/**
 * numpy's pairwise summation of a[from, to), the order `np.sum` and `np.mean`
 * add a contiguous row in (`pairwise_sum` in numpy's loops_utils.h): plainly
 * below 8 values, eight running sums up to 128, and halves (on a multiple of
 * 8) above. pandas' `Series.sum()` / `.mean()` add the same way.
 */
export function npSum(a: ArrayLike<number>, from = 0, to = a.length): number {
    const n = to - from;
    if (n < 8) {
        let res = 0;
        for (let i = from; i < to; i++) res += a[i];
        return res;
    }
    if (n <= 128) {
        const r = [a[from], a[from + 1], a[from + 2], a[from + 3], a[from + 4], a[from + 5], a[from + 6], a[from + 7]];
        let i = 8;
        for (; i < n - (n % 8); i += 8) for (let j = 0; j < 8; j++) r[j] += a[from + i + j];
        // prettier-ignore
        let res = ((r[0] + r[1]) + (r[2] + r[3])) + ((r[4] + r[5]) + (r[6] + r[7]));
        for (; i < n; i++) res += a[from + i];
        return res;
    }
    let n2 = Math.floor(n / 2);
    n2 -= n2 % 8;
    return npSum(a, from, from + n2) + npSum(a, from + n2, to);
}

/** The mean of the `length` values ending at `end` (inclusive), as `np.mean` computes it. */
export function windowMean(x: ArrayLike<number>, end: number, length: number): number {
    return npSum(x, end - length + 1, end + 1) / length;
}

/** Each value of the window ending at `end` minus the window's numpy mean, oldest first. */
export function windowDeviations(x: ArrayLike<number>, end: number, length: number): Float64Array {
    const mean = windowMean(x, end, length);
    const dev = new Float64Array(length);
    for (let k = 0; k < length; k++) dev[k] = x[end - length + 1 + k] - mean;
    return dev;
}

/** The sum of each deviation to the power `order`, added pairwise (`(dev**order).sum()`). */
export function powerSum(dev: Float64Array, order: number): number {
    const p = new Float64Array(dev.length);
    for (let k = 0; k < dev.length; k++) p[k] = order === 2 ? dev[k] * dev[k] : dev[k] ** order;
    return npSum(p);
}

/** The window's variance with `ddof`, as `ndarray.var` computes it. */
export function windowVariance(x: ArrayLike<number>, end: number, length: number, ddof: number): number {
    return powerSum(windowDeviations(x, end, length), 2) / (length - ddof);
}

/** numpy `windows.var(axis=1, ddof)` over each full window of `length`, NaN before the first. */
export function rollingVar(x: Series, length: number, ddof = 0): Series {
    const out = nans(x.length);
    for (let i = length - 1; i < x.length; i++) out[i] = windowVariance(x, i, length, ddof);
    return out;
}

// --------------------------------------------------------------- pandas rolling

/**
 * pandas' fixed-window `rolling(length).sum()` / `.mean()` as its Cython does
 * it: a running total with Kahan compensation (one for the values added, one
 * for the values taken away), recomputed from scratch when the window does not
 * move forward, an exact answer when one value fills the whole window, and for
 * the mean a sign clamp. NaN and an infinity count as missing (pandas turns an
 * infinity into NaN first), so a window holding one is NaN.
 */
function pandasRolling(x: readonly (number | null)[], length: number, mean: boolean): Series {
    const n = x.length;
    const out = nans(n);
    const val = (i: number): number => {
        const v = x[i];
        return v !== null && Number.isFinite(v) ? v : NaN;
    };
    let nobs = 0;
    let sum = 0;
    let negCt = 0;
    let compAdd = 0;
    let compRemove = 0;
    let sameCount = 0;
    let prev = NaN;
    const add = (v: number) => {
        if (!isNum(v)) return;
        nobs++;
        const y = v - compAdd;
        const t = sum + y;
        compAdd = t - sum - y;
        sum = t;
        if (v < 0 || Object.is(v, -0)) negCt++;
        if (v === prev) sameCount++;
        else sameCount = 1;
        prev = v;
    };
    const remove = (v: number) => {
        if (!isNum(v)) return;
        nobs--;
        const y = -v - compRemove;
        const t = sum + y;
        compRemove = t - sum - y;
        sum = t;
        if (v < 0 || Object.is(v, -0)) negCt--;
    };
    for (let i = 0; i < n; i++) {
        const s = Math.max(0, i - length + 1);
        if (i === 0 || s >= i) {
            prev = val(s);
            sameCount = 0;
            nobs = 0;
            sum = 0;
            negCt = 0;
            compAdd = 0;
            compRemove = 0;
            for (let j = s; j <= i; j++) add(val(j));
        } else {
            for (let j = Math.max(0, i - length); j < s; j++) remove(val(j));
            add(val(i));
        }
        if (nobs < length || nobs === 0) continue;
        if (!mean) {
            out[i] = sameCount >= nobs ? prev * nobs : sum;
            continue;
        }
        let result = sum / nobs;
        if (sameCount >= nobs) result = prev;
        else if (negCt === 0 && result < 0) result = 0;
        else if (negCt === nobs && result > 0) result = 0;
        out[i] = result;
    }
    return out;
}

/** pandas `x.rolling(length).sum()`. */
export const rollingSum = (x: readonly (number | null)[], length: number): Series => pandasRolling(x, length, false);
/** pandas `x.rolling(length).mean()`. */
export const rollingMean = (x: readonly (number | null)[], length: number): Series => pandasRolling(x, length, true);

/** pandas `x.rolling(length).max()` / `.min()`: NaN until the window holds `length` values. */
function rollingExtreme(x: readonly number[], length: number, max: boolean): Series {
    const out = nans(x.length);
    for (let i = length - 1; i < x.length; i++) {
        let best = NaN;
        let count = 0;
        for (let j = i - length + 1; j <= i; j++) {
            const v = x[j];
            if (!isNum(v)) continue;
            count++;
            if (!isNum(best) || (max ? v > best : v < best)) best = v;
        }
        if (count >= length) out[i] = best;
    }
    return out;
}

export const rollingMax = (x: readonly number[], length: number) => rollingExtreme(x, length, true);
export const rollingMin = (x: readonly number[], length: number) => rollingExtreme(x, length, false);

/**
 * Each full window dotted with `weights` (oldest value first), NaN where the
 * window is not full or holds a NaN: pandas
 * `x.rolling(n).apply(lambda w: np.dot(weights, w), raw=True)`, and TA-Lib's
 * weighted averages written directly.
 */
export function rollingDot(x: readonly number[], weights: readonly number[]): Series {
    const length = weights.length;
    const out = nans(x.length);
    let valid = 0;
    for (let i = 0; i < x.length; i++) {
        valid = isNum(x[i]) ? valid + 1 : 0;
        if (valid < length) continue;
        let s = 0;
        for (let j = 0; j < length; j++) s += weights[j] * x[i - length + 1 + j];
        out[i] = s;
    }
    return out;
}

// ------------------------------------------------------------------- pandas ewm

/** pandas' alpha from `span` (com = (span - 1) / 2). */
export const spanAlpha = (span: number) => 1 / (1 + (span - 1) / 2);
/** pandas' alpha from `alpha` (com = (1 - alpha) / alpha). */
export const directAlpha = (alpha: number) => 1 / (1 + (1 - alpha) / alpha);

/** pandas `x.ewm(alpha=..., adjust=False).mean()`, ignore_na False, NaN handling as pandas' (a null reads as NaN). */
export function ewm(xs: readonly (number | null)[], alpha: number): Series {
    const x = fromOutput(xs);
    const n = x.length;
    const out = nans(n);
    if (n === 0) return out;
    const oldWtFactor = 1 - alpha;
    let weighted = x[0];
    let nobs = isNum(weighted) ? 1 : 0;
    out[0] = nobs >= 1 ? weighted : NaN;
    let oldWt = 1;
    for (let i = 1; i < n; i++) {
        const cur = x[i];
        const obs = isNum(cur);
        if (obs) nobs += 1;
        if (isNum(weighted)) {
            oldWt *= oldWtFactor;
            if (obs) {
                if (weighted !== cur) {
                    weighted = oldWt * weighted + alpha * cur;
                    weighted /= oldWt + alpha;
                }
                oldWt = 1;
            }
        } else if (obs) {
            weighted = cur;
        }
        out[i] = nobs >= 1 ? weighted : NaN;
    }
    return out;
}

/**
 * pandas-ta-classic's SMA-seeded average (`ema` with sma=True, and `rma`):
 * the first `length` values after any leading NaN are replaced by their numpy
 * mean at the last of them, then pandas' ewm. All NaN when that window does
 * not fit.
 */
export function seededEwm(xs: readonly (number | null)[], length: number, alpha: number): Series {
    const x = fromOutput(xs);
    const n = x.length;
    const fv = x.findIndex(isNum);
    if (fv < 0 || fv + length > n) return nans(n);
    const seedWindow: number[] = [];
    for (let j = fv; j < fv + length; j++) if (isNum(x[j])) seedWindow.push(x[j]);
    const y = x.slice();
    for (let j = 0; j < fv + length - 1; j++) y[j] = NaN;
    y[fv + length - 1] = npSum(seedWindow) / seedWindow.length;
    return ewm(y, alpha);
}

/** pandas-ta-classic `ema(x, length)` (talib off): SMA seed, span alpha. */
export const ptacEma = (x: readonly (number | null)[], length: number) => seededEwm(x, length, spanAlpha(length));
/** pandas-ta-classic `rma(x, length)`: SMA seed, Wilder's alpha 1 / length. */
export const ptacRma = (x: readonly (number | null)[], length: number) => seededEwm(x, length, directAlpha(1 / length));

/**
 * TA-Lib's EMA as its Python wrapper runs it: from the first non-NaN value,
 * seeded with the plain mean of the first `length`, then
 * prev + (x - prev) x 2 / (length + 1). A NaN after the start propagates.
 */
export function talibEma(x: readonly number[], length: number): Series {
    const n = x.length;
    const out = nans(n);
    const fv = x.findIndex(isNum);
    if (fv < 0 || fv + length > n) return out;
    const k = 2.0 / (length + 1);
    let total = 0;
    for (let j = fv; j < fv + length; j++) total += x[j];
    let prev = total / length;
    out[fv + length - 1] = prev;
    for (let i = fv + length; i < n; i++) {
        prev = (x[i] - prev) * k + prev;
        out[i] = prev;
    }
    return out;
}

// ------------------------------------------------------------- the classic MAs

/** pandas-ta-classic `wma(x, length)` (ascending weights 1..length over their total). */
export function ptacWma(x: readonly number[], length: number): Series {
    const w = Array.from({ length }, (_, i) => i + 1);
    const total = 0.5 * length * (length + 1);
    return rollingDot(x, w).map((v) => v / total);
}

/** pandas-ta-classic `symmetric_triangle(length, weighted=True)`. */
export function triangleWeights(length: number): number[] {
    let t: number[];
    if (length === 1) t = [1];
    else if (length === 2) t = [1, 1];
    else if (length % 2 === 0) {
        const front = Array.from({ length: Math.floor(length / 2) }, (_, i) => i + 1);
        t = [...front, ...front.slice().reverse()];
    } else {
        const front = Array.from({ length: Math.floor(0.5 * (length + 1)) }, (_, i) => i + 1);
        t = [...front, ...front.slice(0, -1).reverse()];
    }
    const sum = npSum(t);
    return t.map((v) => v / sum);
}

/** pandas-ta-classic `swma(x, length)`: the symmetric-triangle weighted average. */
export const ptacSwma = (x: readonly number[], length: number) => rollingDot(x, triangleWeights(length));

export type LinregKind = 'value' | 'tsf' | 'slope' | 'r';

/**
 * pandas-ta-classic `linreg(x, length)` (its own numpy path): least squares on
 * x = 0..length-1 over each full window. `value` is the fitted value at the
 * window's last bar, `tsf` one bar past it, `r` the correlation.
 */
export function ptacLinreg(x: readonly number[], length: number, kind: LinregKind = 'value'): Series {
    const n = x.length;
    const out = nans(n);
    if (length > n) return out;
    const xSum = 0.5 * length * (length - 1);
    const x2Sum = (length * (length - 1) * (2 * length - 1)) / 6;
    const divisor = length * x2Sum - xSum * xSum;
    const xy = new Array(length);
    const yy = new Array(length);
    for (let i = length - 1; i < n; i++) {
        const from = i - length + 1;
        for (let j = 0; j < length; j++) {
            const v = x[from + j];
            xy[j] = v * j;
            yy[j] = v * v;
        }
        const ySum = npSum(x, from, i + 1);
        const xySum = npSum(xy);
        const m = (length * xySum - xSum * ySum) / divisor;
        if (kind === 'slope') {
            out[i] = m;
            continue;
        }
        if (kind === 'r') {
            const rn = length * xySum - xSum * ySum;
            const rd = Math.sqrt(divisor * (length * npSum(yy) - ySum * ySum));
            out[i] = rn / rd;
            continue;
        }
        const b = (ySum * x2Sum - xSum * xySum) / divisor;
        out[i] = kind === 'tsf' ? m * length + b : m * (length - 1) + b;
    }
    return out;
}

// --------------------------------------------------------------- true range, ATR

/** pandas-ta-classic `true_range(high, low, close)`: a zero range read as EPSILON bar by bar; NaN on the first bar. */
export function ptacTrueRange(bars: readonly SpecBar[]): Series {
    return bars.map((b, i) => {
        if (i === 0) return NaN;
        const pc = bars[i - 1].close;
        const hl = b.high - b.low !== 0 ? b.high - b.low : EPSILON;
        return Math.max(Math.abs(hl), Math.abs(b.high - pc), Math.abs(pc - b.low));
    });
}

/** pandas-ta-classic `atr` with its own Python: the true range averaged by Wilder's RMA or a simple average. */
export function ptacAtr(bars: readonly SpecBar[], length: number, mamode: 'rma' | 'sma' = 'rma'): Series {
    const tr = ptacTrueRange(bars);
    return mamode === 'rma' ? ptacRma(tr, length) : rollingMean(tr, length);
}

/**
 * pandas-ta 0.4.71b0's `true_range`: the bar's range (EPSILON added to EVERY
 * bar's range when any bar's is zero), |high - previous close| and
 * |previous close - low|; the first bar, with no previous close, is its range.
 */
export function ptaTrueRange(bars: readonly SpecBar[]): Series {
    const n = bars.length;
    const anyZero = bars.some((b) => b.high - b.low === 0);
    const out = nans(n);
    for (let i = 0; i < n; i++) {
        let hl = bars[i].high - bars[i].low;
        if (anyZero) hl += EPSILON;
        if (i === 0) {
            out[i] = Math.abs(hl);
            continue;
        }
        const pc = bars[i - 1].close;
        out[i] = Math.max(Math.abs(hl), Math.abs(bars[i].high - pc), Math.abs(pc - bars[i].low));
    }
    return out;
}

/**
 * pandas-ta 0.4.71b0's `atr` without TA-Lib: the true range, its first
 * `length` bars replaced by their mean on bar length - 1, then averaged by
 * Wilder's RMA (unseeded ewm) or a simple average.
 */
export function ptaAtr(bars: readonly SpecBar[], length: number, mamode: 'rma' | 'sma'): Series {
    const tr = ptaTrueRange(bars);
    if (tr.length < length) return nans(tr.length);
    let seed = 0;
    for (let i = 0; i < length; i++) seed += tr[i];
    seed /= length;
    for (let i = 0; i < length - 1; i++) tr[i] = NaN;
    tr[length - 1] = seed;
    return mamode === 'rma' ? ewm(tr, 1.0 / length) : rollingMean(tr, length);
}

// ------------------------------------- folded in after the P2 batches 6 to 8

/** numpy's float64 epsilon times 1e3: pandas' bound for an update that lost all but about three digits. */
const INV_COND_TOL = 2.220446049250313e-16 * 1e3;

/**
 * pandas 3.0 `x.rolling(length).var(ddof)` as its Cython `roll_var` does it:
 * Welford's online mean and sum of squared deviations, each value added with
 * a Kahan compensation on the mean (one for the values added, one for the
 * values taken away). When an add or a remove shrinks the sum of squares
 * below 1e3 epsilons of what it was (a catastrophic cancellation), the window
 * is summed again from scratch. NaN counts as missing; a window short of
 * `length` values is NaN, as is one with no more values than `ddof`. No
 * special case for a window of one repeated value, and a slightly negative
 * result is returned as it is (pandas' `.std` reads it as 0).
 */
export function pandasRollingVar(x: readonly number[], length: number, ddof = 1): Series {
    const n = x.length;
    const out = nans(n);
    let nobs = 0;
    let mean = 0;
    let ssqdm = 0;
    let compAdd = 0;
    let compRemove = 0;
    let unstable = false;
    const add = (v: number) => {
        const prevM2 = ssqdm;
        if (v !== v) return;
        nobs += 1;
        const prevMean = mean - compAdd;
        const y = v - compAdd;
        const t = y - mean;
        compAdd = t + mean - y;
        mean = nobs !== 0 ? mean + t / nobs : 0;
        ssqdm = ssqdm + (v - prevMean) * (v - mean);
        if (prevM2 * INV_COND_TOL > ssqdm) unstable = true;
    };
    const remove = (v: number) => {
        const prevM2 = ssqdm;
        if (v !== v) return;
        nobs -= 1;
        if (nobs !== 0) {
            const prevMean = mean - compRemove;
            const y = v - compRemove;
            const t = y - mean;
            compRemove = t + mean - y;
            mean = mean - t / nobs;
            ssqdm = ssqdm - (v - prevMean) * (v - mean);
            if (prevM2 * INV_COND_TOL > ssqdm) unstable = true;
        } else {
            mean = 0;
            ssqdm = 0;
            unstable = false;
        }
    };
    for (let i = 0; i < n; i++) {
        const s = Math.max(0, i - length + 1);
        if (i > 0) {
            if (i - length >= 0) remove(x[i - length]);
            add(x[i]);
        }
        if (i === 0 || unstable) {
            nobs = 0;
            mean = 0;
            ssqdm = 0;
            compAdd = 0;
            compRemove = 0;
            for (let j = s; j <= i; j++) add(x[j]);
            unstable = false;
        }
        if (nobs >= length && nobs > ddof) out[i] = ssqdm / (nobs - ddof);
    }
    return out;
}

/** The fitted line of each window: its slope per bar and its value at the window's oldest bar. */
export interface TalibLinregFit {
    /** The slope, in value per bar. */
    m: Series;
    /** The fitted value at the oldest bar of the window (TA-Lib's intercept). */
    b: Series;
}

/**
 * TA-Lib's window regression, its arithmetic in its order: the window's sum
 * and its weighted sum (each value weighted by its age in bars) primed by a
 * full scan, then slid one bar at a time, and rebuilt from the window every
 * 32 x period bars or when the departing value outweighs everything left in
 * it (|period x departing| > 100 x sum of |values|). NaN before the first
 * full window. `period` is at least 2.
 */
export function talibLinregFit(x: readonly number[], period: number): TalibLinregFit {
    const n = x.length;
    const m = nans(n);
    const b = nans(n);
    const lookback = period - 1;
    if (n <= lookback) return { m, b };
    const sumX = period * (period - 1) * 0.5;
    const sumXSqr = (period * (period - 1) * (2 * period - 1)) / 6.0;
    const divisor = sumX * sumX - period * sumXSqr;

    let today = lookback;
    let trailingIdx = 0;
    let sumXY = 0;
    let sumY = 0;
    let sumAbs = 0;
    for (let i = period; i-- !== 0; ) {
        const v = x[today - i];
        sumY += v;
        sumXY += i * v;
        sumAbs += Math.abs(v);
    }
    let barsSinceReseed = 32 * period;
    const emit = () => {
        const slope = (period * sumXY - sumX * sumY) / divisor;
        m[today] = slope;
        b[today] = (sumY - slope * sumX) / period;
    };
    emit();
    let trailingValue = x[trailingIdx];
    trailingIdx += 1;
    today += 1;
    while (today < n) {
        const weightedTrailing = period * trailingValue;
        sumXY = sumXY + sumY - weightedTrailing;
        sumY = sumY - trailingValue + x[today];
        sumAbs = sumAbs - Math.abs(trailingValue) + Math.abs(x[today]);
        barsSinceReseed -= 1;
        if (barsSinceReseed <= 0 || Math.abs(weightedTrailing) > 100.0 * sumAbs) {
            barsSinceReseed = 32 * period;
            sumY = 0;
            sumXY = 0;
            sumAbs = 0;
            let w = lookback;
            for (let j = today - lookback; j <= today; j += 1) {
                const v = x[j];
                sumY += v;
                sumXY += w * v;
                sumAbs += Math.abs(v);
                w -= 1.0;
            }
        }
        emit();
        trailingValue = x[trailingIdx];
        trailingIdx += 1;
        today += 1;
    }
    return { m, b };
}

/**
 * pandas-ta 0.4.71b0's 2-pole Super Smoother inside `reflex` and `trendflex`
 * (`np_reflex`, `nb_trendflex`): 0 on the first two bars, then
 * 0.5 c (x + x[-1]) + b f[-1] - a² f[-2], with Ehlers' truncated pi and square
 * root of 2 and the cosine's angle in radians, as the library computes it.
 */
export function ptaFlexSmoother(x: readonly number[], smooth: number, pi = 3.14159, sqrt2 = 1.414): number[] {
    const n = x.length;
    const ratio = (2 * sqrt2) / smooth;
    const a = Math.exp(-pi * ratio);
    const b = 2 * a * Math.cos(180 * ratio);
    const c = a * a - b + 1;
    const f = new Array<number>(n).fill(0);
    for (let i = 2; i < n; i++) f[i] = 0.5 * c * (x[i] + x[i - 1]) + b * f[i - 1] - a * a * f[i - 2];
    return f;
}

// ------------------------------------------- folded in after the P5 batches

// RSI, MACD and CCI as the momentum concepts read them (from momentum/_local.ts)

/**
 * Wilder's RSI: the mean of the first n gains and losses (a plain running
 * sum), then (prev x (n - 1) + now) / n; 100 x gain / (gain + loss), 50 where
 * both are 0. NaN for the first n bars.
 */
export function wilderRsi(x: readonly number[], n: number): Series {
    const out = nans(x.length);
    if (x.length <= n) return out;
    const gain = (i: number) => Math.max(x[i] - x[i - 1], 0.0);
    const loss = (i: number) => Math.max(x[i - 1] - x[i], 0.0);
    let ag = 0.0;
    let al = 0.0;
    for (let j = 1; j <= n; j++) {
        ag += gain(j);
        al += loss(j);
    }
    ag /= n;
    al /= n;
    for (let i = n; i < x.length; i++) {
        if (i > n) {
            ag = (ag * (n - 1) + gain(i)) / n;
            al = (al * (n - 1) + loss(i)) / n;
        }
        out[i] = ag + al === 0.0 ? 50.0 : (100.0 * ag) / (ag + al);
    }
    return out;
}

/**
 * Appel's MACD histogram: the fast minus the slow exponential average (each
 * seeded with the mean of its first n), minus the signal average of that line
 * (seeded the same way from the line's first value).
 */
export function macdHistogram(x: readonly number[], fast: number, slow: number, signal: number): Series {
    const f = talibEma(x, fast);
    const s = talibEma(x, slow);
    const line = f.map((v, i) => v - s[i]);
    const sig = talibEma(line, signal);
    return line.map((v, i) => v - sig[i]);
}

/**
 * Lambert's CCI on the typical price (high + low + close) / 3: its distance
 * from the n-bar mean over 0.015 x the mean absolute deviation; 0 where the
 * deviation is 0 (the price sits on its mean).
 */
export function lambertCci(high: readonly number[], low: readonly number[], close: readonly number[], n: number): Series {
    const tp = close.map((c, i) => (high[i] + low[i] + c) / 3.0);
    const out = nans(tp.length);
    for (let i = n - 1; i < tp.length; i++) {
        let t = 0.0;
        for (let j = i - n + 1; j <= i; j++) t += tp[j];
        const m = t / n;
        let d = 0.0;
        for (let j = i - n + 1; j <= i; j++) d += Math.abs(tp[j] - m);
        d /= n;
        out[i] = d === 0.0 ? 0.0 : (tp[i] - m) / (0.015 * d);
    }
    return out;
}

// rolling median and geometric mean (from moving_averages/_local.ts)

/** numpy `median` of each trailing window of `length` (the mean of the two middle values in an even window); NaN before the first full window. */
export function rollingMedian(x: readonly number[], length: number): Series {
    const n = x.length;
    const out = nans(n);
    if (length < 1) return out;
    const half = Math.floor(length / 2);
    for (let i = length - 1; i < n; i++) {
        const w = x.slice(i - length + 1, i + 1).sort((a, b) => a - b);
        out[i] = length % 2 === 1 ? w[half] : (w[half - 1] + w[half]) / 2;
    }
    return out;
}

/** The geometric mean of each trailing window, exp(mean(log x)); NaN before the first full window and where the window holds a value at or below zero. */
export function rollingGeometricMean(x: readonly number[], length: number): Series {
    const n = x.length;
    const out = nans(n);
    if (length < 1) return out;
    for (let i = length - 1; i < n; i++) {
        let sum = 0;
        let ok = true;
        for (let j = i - length + 1; j <= i; j++) {
            if (!(x[j] > 0)) {
                ok = false;
                break;
            }
            sum += Math.log(x[j]);
        }
        if (ok) out[i] = Math.exp(sum / length);
    }
    return out;
}

// Pearson correlation and log returns (from statistics/_local.ts)

/**
 * Pearson's correlation of two equal-length windows, as numpy computes it from
 * the deviations about each window's mean (sums added pairwise). NaN where
 * either window did not vary (no correlation exists); clipped to [-1, 1].
 */
export function pearson(x: ArrayLike<number>, y: ArrayLike<number>): number {
    const n = x.length;
    const mx = npSum(x) / n;
    const my = npSum(y) / n;
    const pxx = new Float64Array(n);
    const pyy = new Float64Array(n);
    const pxy = new Float64Array(n);
    for (let k = 0; k < n; k++) {
        const dx = x[k] - mx;
        const dy = y[k] - my;
        pxx[k] = dx * dx;
        pyy[k] = dy * dy;
        pxy[k] = dx * dy;
    }
    const sxx = npSum(pxx);
    const syy = npSum(pyy);
    if (sxx === 0 || syy === 0) return NaN;
    const r = npSum(pxy) / Math.sqrt(sxx * syy);
    return r > 1 ? 1 : r < -1 ? -1 : r;
}

/** Log returns, ln(x[t] / x[t - 1]), NaN on the first bar. */
export function logReturns(x: readonly number[]): number[] {
    return x.map((v, t) => (t === 0 ? NaN : Math.log(v / x[t - 1])));
}

// Wilder's own ATR (also bands_channels') (from trend_strength/_local.ts)

/**
 * Wilder's average true range: the true range from the second bar (the
 * first has no previous close), the first ATR on bar `length` the plain mean
 * of the first `length` true ranges, then ((length - 1) x ATR + TR) / length.
 * NaN before it.
 */
export function wilderAtr(bars: readonly SpecBar[], length: number): number[] {
    const n = bars.length;
    const out = new Array<number>(n).fill(NaN);
    if (length < 1 || length >= n) return out;
    const tr = (i: number) => {
        const pc = bars[i - 1].close;
        return Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - pc), Math.abs(bars[i].low - pc));
    };
    let seed = 0;
    for (let i = 1; i <= length; i++) seed += tr(i);
    out[length] = seed / length;
    for (let i = length + 1; i < n; i++) out[i] = ((length - 1) * out[i - 1] + tr(i)) / length;
    return out;
}

// true range and annualisation for the volatility estimators (from volatility/_local.ts)

/** Wilder's true range, max(high, previous close) - min(low, previous close); NaN on the first bar, which has no previous close. */
export function wilderTrueRange(bars: readonly SpecBar[]): Series {
    return bars.map((b, i) => (i === 0 ? NaN : Math.max(b.high, bars[i - 1].close) - Math.min(b.low, bars[i - 1].close)));
}

/** A variance as an annualised volatility in percent, as hvol reads one: 100 x sqrt(variance) x sqrt(bars per year). */
export function annualisedPercent(variance: number, annualization: number): number {
    return 100 * Math.sqrt(variance) * Math.sqrt(annualization);
}

/**
 * The mean of a per-bar variance term over each window of `length` (numpy's
 * pairwise mean), annualised in percent; NaN before the first full window and
 * where the window holds a NaN.
 */
export function annualisedWindowMean(perBar: Series, length: number, annualization: number): Series {
    const out = nans(perBar.length);
    let lastNaN = -1;
    for (let i = 0; i < perBar.length; i++) {
        if (Number.isNaN(perBar[i])) lastNaN = i;
        if (i < length - 1 || lastNaN > i - length) continue;
        out[i] = annualisedPercent(windowMean(perBar, i, length), annualization);
    }
    return out;
}

// Ehlers' filters as his EasyLanguage computes them (angles in degrees) (from cycles/_local.ts)

/** Degrees to radians, as numpy's deg2rad computes it: x x (pi / 180). */
export function deg2rad(x: number): number {
    return x * (Math.PI / 180);
}

/**
 * pandas-ta 0.4.71b0's 2-pole Super Smoother inside `reflex` and `trendflex`
 * (`np_reflex`, `nb_trendflex`) with Ehlers' angle in DEGREES, as his
 * EasyLanguage means it: 0 on the first two bars, then
 * 0.5 c (x + x[-1]) + b f[-1] - a² f[-2], with b = 2 a cos(180° x ratio).
 * libmath's `ptaFlexSmoother` is the library-faithful one (the angle in
 * radians); this is the one the specs use since the 2026-10-13 ruling.
 */
export function ehlersFlexSmoother(x: readonly number[], smooth: number, pi = 3.14159, sqrt2 = 1.414): number[] {
    const n = x.length;
    const ratio = (2 * sqrt2) / smooth;
    const a = Math.exp(-pi * ratio);
    const b = 2 * a * Math.cos(deg2rad(180 * ratio));
    const c = a * a - b + 1;
    const f = new Array<number>(n).fill(0);
    for (let i = 2; i < n; i++) f[i] = 0.5 * c * (x[i] + x[i - 1]) + b * f[i - 1] - a * a * f[i - 2];
    return f;
}

/**
 * Ehlers' two-pole high-pass filter (Cycle Analytics for Traders, 2013; the
 * roofing filter of "Predictive and Successful Indicators", TASC January
 * 2014, Code Listing 2), run from bar `start` with every earlier value 0 (his
 * variables' declared start), the way TradeStation runs it from the first bar
 * whose look-back exists:
 *   alpha = (cos(.707 x 360° / P) + sin(.707 x 360° / P) - 1) / cos(.707 x 360° / P)
 *   HP = (1 - alpha/2)² (x - 2 x[1] + x[2]) + 2 (1 - alpha) HP[1] - (1 - alpha)² HP[2]
 * `x` is read as given before `start` (`start` >= 2): a price is real there, and
 * a series the caller computed holds its 0 there.
 */
export function ehlersHighPass2(x: readonly number[], period: number, start: number): number[] {
    const n = x.length;
    const ang = deg2rad((0.707 * 360) / period);
    const alpha = (Math.cos(ang) + Math.sin(ang) - 1) / Math.cos(ang);
    const k = (1 - alpha / 2) * (1 - alpha / 2);
    const out = new Array<number>(n).fill(0);
    for (let i = start; i < n; i++) {
        out[i] = k * (x[i] - 2 * x[i - 1] + x[i - 2]) + 2 * (1 - alpha) * out[i - 1] - (1 - alpha) * (1 - alpha) * out[i - 2];
    }
    return out;
}

/**
 * Ehlers' Super Smoother (equation 3-3 of Cycle Analytics for Traders; Code
 * Listing 1 of "Predictive and Successful Indicators"), with his truncated
 * 1.414 and 3.14159 and the cosine's angle in degrees, run from bar `start`
 * with every earlier value 0 (`start` >= 2; `x` read as given):
 *   Filt = c1 (x + x[1]) / 2 + c2 Filt[1] + c3 Filt[2]
 */
export function ehlersSuperSmoother(x: readonly number[], period: number, start: number): number[] {
    const n = x.length;
    const a1 = Math.exp((-1.414 * 3.14159) / period);
    const b1 = 2 * a1 * Math.cos(deg2rad((1.414 * 180) / period));
    const c2 = b1;
    const c3 = -a1 * a1;
    const c1 = 1 - c2 - c3;
    const out = new Array<number>(n).fill(0);
    for (let i = start; i < n; i++) out[i] = (c1 * (x[i] + x[i - 1])) / 2 + c2 * out[i - 1] + c3 * out[i - 2];
    return out;
}
