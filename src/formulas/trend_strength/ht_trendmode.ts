// packages/indicators/src/formulas/trend_strength/ht_trendmode.ts
//
// Hilbert Transform Trend vs Cycle Mode: the formula, ported from TA-Lib's ta_HT_TRENDMODE.c.
// Held to its oracle fixture, ht_trendmode.json. PURE.

import { runHilbert } from '../../core/hilbert';
import { nulls, readSource } from '../../core/shared';
import type { DataArray, Formula, OracleTerms } from '../../types';

/** TA-Lib's lookback: 31 bars to settle the price smoother, 32 more for the cycle measurement. */
const LOOKBACK = 63;

/** TA-Lib's HT_TRENDMODE (ta_HT_TRENDMODE.c): 1 in a trend, 0 in a cycle, NaN for the first 63 bars. */
function htTrendMode(x: readonly number[]): number[] {
    const n = x.length;
    const out = new Array<number>(n).fill(NaN);
    if (n <= LOOKBACK) return out;
    const rad2Deg = 45.0 / Math.atan(1);
    const deg2Rad = 1.0 / rad2Deg;
    const constDeg2RadBy360 = Math.atan(1) * 8.0;

    let smoothPeriod = 0.0;
    const smoothPrice = new Array<number>(50).fill(0);
    let smoothPriceIdx = 0;
    let iTrend1 = 0.0;
    let iTrend2 = 0.0;
    let iTrend3 = 0.0;
    let daysInTrend = 0;
    let DCPhase = 0.0;
    let sine = 0.0;
    let leadSine = 0.0;

    // The price smoother settles over 34 bars after its first three; then the
    // shared Hilbert loop (catalog/hilbert.ts) measures the cycle period.
    runHilbert(
        x,
        34,
        (bar) => {
            smoothPrice[smoothPriceIdx] = bar.smoothed;
        },
        (today, period) => {
            smoothPeriod = 0.67 * smoothPeriod + 0.33 * period;

            // The dominant cycle phase, from the smoothed prices over one cycle.
            const prevDCPhase = DCPhase;
            let DCPeriodInt = Math.trunc(smoothPeriod + 0.5);
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
            DCPhase += 360.0 / smoothPeriod;
            if (imagPart < 0.0) DCPhase += 180.0;
            if (DCPhase > 315.0) DCPhase -= 360.0;
            const prevSine = sine;
            const prevLeadSine = leadSine;
            sine = Math.sin(DCPhase * deg2Rad);
            leadSine = Math.sin((DCPhase + 45) * deg2Rad);

            // The instantaneous trendline: the raw price averaged over one cycle, then a 4-bar WMA of those.
            DCPeriodInt = Math.trunc(smoothPeriod + 0.5);
            let avg = 0.0;
            for (let j = 0; j < 50; j++) if (j < DCPeriodInt && today - j >= 0) avg += x[today - j];
            if (DCPeriodInt > 0) avg = avg / DCPeriodInt;
            const trendline = (2.0 * iTrend2 + (4.0 * avg + 3.0 * iTrend1) + iTrend3) / 10.0;
            iTrend3 = iTrend2;
            iTrend2 = iTrend1;
            iTrend1 = avg;

            // The mode: a sine crossing starts a cycle; a trend needs half a cycle without one, a phase that is not
            // advancing at the cycle's pace, or price 1.5% away from the trendline.
            let trend = 1;
            if ((sine > leadSine && prevSine <= prevLeadSine) || (sine < leadSine && prevSine >= prevLeadSine)) {
                daysInTrend = 0;
                trend = 0;
            }
            daysInTrend += 1;
            if (daysInTrend < 0.5 * smoothPeriod) trend = 0;
            const phaseStep = DCPhase - prevDCPhase;
            if (smoothPeriod !== 0.0 && phaseStep > (0.67 * 360.0) / smoothPeriod && phaseStep < (1.5 * 360.0) / smoothPeriod) trend = 0;
            if (trendline !== 0.0 && Math.abs((smoothPrice[smoothPriceIdx] - trendline) / trendline) >= 0.015) trend = 1;
            if (today >= LOOKBACK) out[today] = trend;

            smoothPriceIdx = smoothPriceIdx === 49 ? 0 : smoothPriceIdx + 1;
        },
    );
    return out;
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const m = htTrendMode(readSource(bars, config));
    for (let i = LOOKBACK; i < n; i++) value[i] = m[i];
    return { value };
};

/** How it meets its oracle fixture, beyond the default comparison. */
export const oracle: OracleTerms = {
    skipLeading: LOOKBACK,
    reason: 'The Python wrapper fills an integer output\'s first 63 bars (TA-Lib\'s lookback, where the C writes nothing) with 0 rather than NaN, which would read as cycle mode; the study writes null there.',
};
