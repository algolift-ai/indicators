// packages/indicators/src/formulas/trend_strength/adxr.ts
//
// ADX Rating (ADXR): the formula, ported from TA-Lib's ta_ADXR.c.
// Held to its oracle fixture, adxr.json. PURE.

import { intSetting, nulls } from '../../core/shared';
import type { DataArray, Formula, SpecBar } from '../../types';

/** TA-Lib's TA_IS_ZERO. */
const isZero = (v: number) => -0.00000001 < v && v < 0.00000001;

/** TA-Lib's ADX (ta_ADX.c), one value per bar from bar 2n - 1, NaN before. */
function adx(bars: readonly SpecBar[], period: number): number[] {
    const n = bars.length;
    const out = new Array<number>(n).fill(NaN);
    const lookback = 2 * period - 1;
    if (n <= lookback) return out;
    let prevHigh = bars[0].high;
    let prevLow = bars[0].low;
    let prevClose = bars[0].close;
    let prevMinusDM = 0;
    let prevPlusDM = 0;
    let prevTR = 0;
    let today = 0;
    // One bar's directional movement and true range, in TA-Lib's order; `smooth` decays the running sums first.
    const step = (smooth: boolean) => {
        today += 1;
        const high = bars[today].high;
        const diffP = high - prevHigh;
        prevHigh = high;
        const low = bars[today].low;
        const diffM = prevLow - low;
        prevLow = low;
        if (smooth) {
            prevMinusDM -= prevMinusDM / period;
            prevPlusDM -= prevPlusDM / period;
        }
        if (diffM > 0 && diffP < diffM) prevMinusDM += diffM;
        else if (diffP > 0 && diffP > diffM) prevPlusDM += diffP;
        let tr = prevHigh - prevLow;
        let tmp = Math.abs(prevHigh - prevClose);
        if (tmp > tr) tr = tmp;
        tmp = Math.abs(prevLow - prevClose);
        if (tmp > tr) tr = tmp;
        prevTR = smooth ? prevTR - prevTR / period + tr : prevTR + tr;
        prevClose = bars[today].close;
    };
    // The DX of the current sums, or null where TA-Lib skips it.
    const dx = (): number | null => {
        if (!(prevTR > 0.0)) return null;
        const minusDI = 100.0 * (prevMinusDM / prevTR);
        const plusDI = 100.0 * (prevPlusDM / prevTR);
        const sum = minusDI + plusDI;
        return isZero(sum) ? null : 100.0 * (Math.abs(minusDI - plusDI) / sum);
    };
    for (let i = period - 1; i > 0; i--) step(false);
    let sumDX = 0;
    for (let i = period; i > 0; i--) {
        step(true);
        const d = dx();
        if (d !== null) sumDX += d;
    }
    let prevADX = sumDX / period;
    out[today] = prevADX;
    while (today < n - 1) {
        step(true);
        const d = dx();
        if (d !== null) prevADX = (prevADX * (period - 1) + d) / period;
        out[today] = prevADX;
    }
    return out;
}

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const value: DataArray = nulls(n);
    const period = intSetting(config.period, 14, 2);
    if (period === null) return { value };
    const a = adx(bars, period);
    for (let i = 3 * period - 2; i < n; i++) value[i] = (a[i] + a[i - (period - 1)]) / 2.0;
    return { value };
};
