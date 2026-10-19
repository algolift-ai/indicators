// packages/indicators/src/formulas/candlestick_patterns/cdl_longleggeddoji.ts
//
// Long Legged Doji: the formula, ported from TA-Lib's ta_CDLLONGLEGGEDDOJI.c.
// Held to its oracle fixture, cdl_longleggeddoji.json. PURE.

import { CandleTotal, lowerShadow, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyDoji', 'ShadowLong'));
    const doji = new CandleTotal(bars, 'BodyDoji', start);
    const shadow = new CandleTotal(bars, 'ShadowLong', start);
    for (let i = start; i < bars.length; i++) {
        const b = bars[i];
        if (realBody(b) <= doji.average(i) && (lowerShadow(b) > shadow.average(i) || upperShadow(b) > shadow.average(i))) value[i] = 100;
        doji.advance(i);
        shadow.advance(i);
    }
    return value;
};
