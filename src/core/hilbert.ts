// packages/indicators/src/core/hilbert.ts
//
// TA-LIB'S HILBERT TRANSFORM CORE, ONCE (the 500-indicator plan, P2,
// 2026-10-13). Ehlers' dominant-cycle machinery as TA-Lib's C writes it in
// every HT_* function and MAMA: the 4-bar WMA price smoother, the four
// Hilbert transforms on alternating odd and even banks, the phasor and the
// smoothed cycle period. Moved from moving_averages/kit.ts (MAMA,
// HT_TRENDLINE); HT_TRENDMODE and the cycles family's HT_DCPERIOD,
// HT_DCPHASE, HT_PHASOR and HT_SINE build on it. Each function's own prime
// length and per-bar work stay in its spec: read its ta_HT_*.c.
//
// TA-Lib's fused multiply-adds are written as a multiply and an add.
//
// PURE.

// ------------------------------------------------------------ the Hilbert core

const HT_A = 0.0962;
const HT_B = 0.5769;

/** One of TA-Lib's Hilbert transforms (`DO_HILBERT_TRANSFORM`), with its odd- and even-bar buffers. */
function hilbertTransform() {
    const odd = [0, 0, 0];
    const even = [0, 0, 0];
    let prevOdd = 0;
    let prevEven = 0;
    let prevInputOdd = 0;
    let prevInputEven = 0;
    return (input: number, isEven: boolean, idx: number, adjustedPrevPeriod: number): number => {
        const t = HT_A * input;
        let v: number;
        if (isEven) {
            v = 0 - even[idx];
            even[idx] = t;
            v += t;
            v -= prevEven;
            prevEven = HT_B * prevInputEven;
            v += prevEven;
            prevInputEven = input;
        } else {
            v = 0 - odd[idx];
            odd[idx] = t;
            v += t;
            v -= prevOdd;
            prevOdd = HT_B * prevInputOdd;
            v += prevOdd;
            prevInputOdd = input;
        }
        return v * adjustedPrevPeriod;
    };
}

export interface HilbertBar {
    /** The bar's index into the input. */
    today: number;
    /** The 4-bar WMA smoothed price on this bar (TA-Lib's smoothedValue). */
    smoothed: number;
    /** The quadrature component Q1 and the in-phase I1 (the detrender three bars back) the phase is read from. */
    q1: number;
    i1: number;
}

/**
 * TA-Lib's Hilbert dominant-cycle loop as TA_MAMA and TA_HT_TRENDLINE share
 * it: a 4-bar WMA smoother primed over `primeBars` bars after its first
 * three, then per bar the detrender, Q1, jI and jQ transforms, the phasor and
 * the smoothed cycle period. `beforePeriod` sees each bar before its period
 * update (MAMA reads the phase there), `afterPeriod` after (the trendline
 * reads the period). Bars run from index 3 + primeBars to the end; the
 * odd/even buffers follow the bar's index, as the C's `today % 2` does.
 */
export function runHilbert(
    x: readonly number[],
    primeBars: number,
    beforePeriod: (bar: HilbertBar) => void,
    afterPeriod: (today: number, period: number) => void,
): void {
    const n = x.length;
    if (n < 3 + primeBars) return;
    let trailingWMAIdx = 0;
    let today = 0;
    let tempReal = x[today++];
    let periodWMASub = tempReal;
    let periodWMASum = tempReal;
    tempReal = x[today++];
    periodWMASub += tempReal;
    periodWMASum += tempReal * 2.0;
    tempReal = x[today++];
    periodWMASub += tempReal;
    periodWMASum += tempReal * 3.0;
    let trailingWMAValue = 0.0;
    let smoothedValue: number;
    for (let i = primeBars; i > 0; i--) {
        tempReal = x[today++];
        periodWMASub += tempReal;
        periodWMASub -= trailingWMAValue;
        periodWMASum += tempReal * 4.0;
        trailingWMAValue = x[trailingWMAIdx++];
        smoothedValue = periodWMASum * 0.1;
        periodWMASum -= periodWMASub;
    }

    const detrenderT = hilbertTransform();
    const q1T = hilbertTransform();
    const jIT = hilbertTransform();
    const jQT = hilbertTransform();
    let hilbertIdx = 0;
    let period = 0.0;
    let prevQ2 = 0.0;
    let prevI2 = 0.0;
    let re = 0.0;
    let im = 0.0;
    let i1ForOddPrev3 = 0.0;
    let i1ForOddPrev2 = 0.0;
    let i1ForEvenPrev3 = 0.0;
    let i1ForEvenPrev2 = 0.0;
    const rad2Deg = 180.0 / (4.0 * Math.atan(1));

    while (today < n) {
        const adjustedPrevPeriod = 0.075 * period + 0.54;
        const todayValue = x[today];
        periodWMASub += todayValue;
        periodWMASub -= trailingWMAValue;
        periodWMASum += todayValue * 4.0;
        trailingWMAValue = x[trailingWMAIdx++];
        smoothedValue = periodWMASum * 0.1;
        periodWMASum -= periodWMASub;

        const isEven = today % 2 === 0;
        const i1 = isEven ? i1ForEvenPrev3 : i1ForOddPrev3;
        const detrender = detrenderT(smoothedValue, isEven, hilbertIdx, adjustedPrevPeriod);
        const q1 = q1T(detrender, isEven, hilbertIdx, adjustedPrevPeriod);
        const jI = jIT(i1, isEven, hilbertIdx, adjustedPrevPeriod);
        const jQ = jQT(q1, isEven, hilbertIdx, adjustedPrevPeriod);
        if (isEven && ++hilbertIdx === 3) hilbertIdx = 0;
        const q2 = 0.2 * (q1 + jI) + 0.8 * prevQ2;
        const i2 = 0.2 * (i1 - jQ) + 0.8 * prevI2;
        if (isEven) {
            i1ForOddPrev3 = i1ForOddPrev2;
            i1ForOddPrev2 = detrender;
        } else {
            i1ForEvenPrev3 = i1ForEvenPrev2;
            i1ForEvenPrev2 = detrender;
        }

        beforePeriod({ today, smoothed: smoothedValue, q1, i1 });

        re = 0.8 * re + 0.2 * (i2 * prevI2 + q2 * prevQ2);
        im = 0.8 * im + 0.2 * (i2 * prevQ2 - q2 * prevI2);
        prevQ2 = q2;
        prevI2 = i2;
        const last = period;
        if (im !== 0.0 && re !== 0.0) period = 360.0 / (Math.atan(im / re) * rad2Deg);
        if (period > 1.5 * last) period = 1.5 * last;
        if (period < 0.67 * last) period = 0.67 * last;
        if (period < 6) period = 6;
        else if (period > 50) period = 50;
        period = 0.2 * period + 0.8 * last;

        afterPeriod(today, period);
        today += 1;
    }
}

// ------------------------------------------------- the dominant cycle phase
// Folded in from cycles/_local.ts (HT_DCPHASE, HT_SINE); HT_TRENDMODE computes
// the same phase inline beside its sine and trendline.

/** Bars the price smoother settles over after its first three, in HT_DCPHASE, HT_SINE and HT_TRENDMODE. */
export const HT_PHASE_PRIME_BARS = 34;
/** Their lookback: 37 bars of smoothing, then 26 more for the 50-bar price buffer and the period to settle. */
export const HT_PHASE_LOOKBACK = 63;

/**
 * TA-Lib's dominant cycle phase in degrees (`DCPhase` in ta_HT_DCPHASE.c and
 * ta_HT_SINE.c), one per bar from the first bar the Hilbert loop reaches;
 * NaN before it. The caller keeps bars from HT_PHASE_LOOKBACK on. The C's
 * fused multiply-adds are written as a multiply and an add.
 */
export function htDcPhase(x: readonly number[]): number[] {
    const n = x.length;
    const out = new Array<number>(n).fill(NaN);
    const rad2Deg = 45.0 / Math.atan(1);
    const constDeg2RadBy360 = Math.atan(1) * 8.0;
    const smoothPrice = new Array<number>(50).fill(0);
    let smoothPriceIdx = 0;
    let smoothPeriod = 0.0;
    let DCPhase = 0.0;
    runHilbert(
        x,
        HT_PHASE_PRIME_BARS,
        (bar) => {
            smoothPrice[smoothPriceIdx] = bar.smoothed;
        },
        (today, period) => {
            smoothPeriod = 0.67 * smoothPeriod + 0.33 * period;
            // The phase of the smoothed prices over one cycle, newest first.
            const DCPeriodInt = Math.trunc(smoothPeriod + 0.5);
            let realPart = 0.0;
            let imagPart = 0.0;
            let idx = smoothPriceIdx;
            for (let i = 0; i < DCPeriodInt; i++) {
                const angle = (i * constDeg2RadBy360) / DCPeriodInt;
                const price = smoothPrice[idx];
                realPart += Math.sin(angle) * price;
                imagPart += Math.cos(angle) * price;
                idx = idx === 0 ? 49 : idx - 1;
            }
            const absImag = Math.abs(imagPart);
            if (absImag > 0.0) DCPhase = Math.atan(realPart / imagPart) * rad2Deg;
            else if (absImag <= 0.01) {
                if (realPart < 0.0) DCPhase -= 90.0;
                else if (realPart > 0.0) DCPhase += 90.0;
            }
            DCPhase += 90.0;
            // The smoother's one-bar lag, compensated.
            DCPhase += 360.0 / smoothPeriod;
            if (imagPart < 0.0) DCPhase += 180.0;
            if (DCPhase > 315.0) DCPhase -= 360.0;
            out[today] = DCPhase;
            smoothPriceIdx = smoothPriceIdx === 49 ? 0 : smoothPriceIdx + 1;
        },
    );
    return out;
}
