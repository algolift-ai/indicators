// packages/indicators/src/formulas/candlestick_patterns/cdl_longline.ts
//
// Long Line Candle: the formula, ported from TA-Lib's ta_CDLLONGLINE.c.
// Held to its oracle fixture, cdl_longline.json. PURE.

import { candleColor, CandleTotal, lowerShadow, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyLong', 'ShadowShort'));
    const body = new CandleTotal(bars, 'BodyLong', start);
    const shadow = new CandleTotal(bars, 'ShadowShort', start);
    for (let i = start; i < bars.length; i++) {
        const b = bars[i];
        if (realBody(b) > body.average(i) && upperShadow(b) < shadow.average(i) && lowerShadow(b) < shadow.average(i)) value[i] = candleColor(b) * 100;
        body.advance(i);
        shadow.advance(i);
    }
    return value;
};
