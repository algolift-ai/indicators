// packages/indicators/src/formulas/candlestick_patterns/_tweezer.ts
//
// What the two Tweezers share: they are technicalindicators 3.1.0's
// TweezerBottom and TweezerTop, not TA-Lib, so they read none of the candle
// machinery's settings. Both judge a window of five bars (the library's
// `requiredCount`), take the trend from the closes of its first three with
// the library's averagegain / averageloss at period 2, and look for equal lows
// (a bottom) or equal highs (a top) on its last two.
//
// PURE.

import { patternFrame } from '../../core/candles';
import type { DataArray, SpecBar } from '../../types';

/** technicalindicators' `requiredCount` for both Tweezers: bars a window holds. */
export const TWEEZER_WINDOW = 5;

/**
 * technicalindicators' averagegain and averageloss, period 2, over the closes
 * of bars i - 4, i - 3 and i - 2 (the window's first three): each the sum of
 * that side's two moves (0 for a move the other way) over 2, summed in the
 * library's order. With three values and a period of 2 the library returns
 * exactly one average, before its Wilder smoothing ever runs.
 */
export function tweezerTrend(bars: readonly SpecBar[], i: number): { gain: number; loss: number } {
    let gainSum = 0;
    let lossSum = 0;
    for (let k = i - 3; k <= i - 2; k++) {
        const last = bars[k - 1].close;
        const current = bars[k].close;
        let gain = current - last;
        gain = gain > 0 ? gain : 0;
        if (gain > 0) gainSum = gainSum + gain;
        let loss = last - current;
        loss = loss > 0 ? loss : 0;
        if (loss > 0) lossSum = lossSum + loss;
    }
    return { gain: gainSum / 2, loss: lossSum / 2 };
}

/**
 * A Tweezer as a series: null before the window's fifth bar, 100 on a
 * bottom (a falling trend, then two bars with exactly equal lows), -100 on
 * a top (a rising trend, then two bars with exactly equal highs), 0
 * otherwise. The averages are compared as numbers (see the specs' changes).
 */
export function tweezer(bars: readonly SpecBar[], top: boolean): DataArray {
    const { value, start } = patternFrame(bars.length, TWEEZER_WINDOW - 1);
    for (let i = start; i < bars.length; i++) {
        const { gain, loss } = tweezerTrend(bars, i);
        if (top ? gain > loss && bars[i - 1].high === bars[i].high : loss > gain && bars[i - 1].low === bars[i].low) value[i] = top ? -100 : 100;
    }
    return value;
}
