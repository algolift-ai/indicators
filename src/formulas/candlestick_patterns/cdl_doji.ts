// packages/indicators/src/formulas/candlestick_patterns/cdl_doji.ts
//
// Doji: the formula, ported from TA-Lib's ta_CDLDOJI.c.
// Held to its oracle fixture, cdl_doji.json. PURE.

import { avgPeriod, CandleTotal, patternFrame, realBody } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, avgPeriod('BodyDoji'));
    const doji = new CandleTotal(bars, 'BodyDoji', start);
    for (let i = start; i < bars.length; i++) {
        if (realBody(bars[i]) <= doji.average(i)) value[i] = 100;
        doji.advance(i);
    }
    return value;
};
