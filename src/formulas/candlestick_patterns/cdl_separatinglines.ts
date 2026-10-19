// packages/indicators/src/formulas/candlestick_patterns/cdl_separatinglines.ts
//
// Separating Lines: the formula, ported from TA-Lib's ta_CDLSEPARATINGLINES.c.
// Held to its oracle fixture, cdl_separatinglines.json. PURE.

import { candleColor, CandleTotal, lowerShadow, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('ShadowVeryShort', 'BodyLong', 'Equal') + 1);
    // The shadow and the long body are judged at i, Equal on the first candle.
    const shadow = new CandleTotal(bars, 'ShadowVeryShort', start);
    const long = new CandleTotal(bars, 'BodyLong', start);
    const equal = new CandleTotal(bars, 'Equal', start - 1);
    for (let i = start; i < bars.length; i++) {
        const p = bars[i - 1];
        const b = bars[i];
        if (
            candleColor(p) === -candleColor(b) &&
            b.open <= p.open + equal.average(i - 1) &&
            b.open >= p.open - equal.average(i - 1) &&
            realBody(b) > long.average(i) &&
            ((candleColor(b) === 1 && lowerShadow(b) < shadow.average(i)) ||
                (candleColor(b) === -1 && upperShadow(b) < shadow.average(i)))
        ) value[i] = candleColor(b) * 100;
        shadow.advance(i);
        long.advance(i);
        equal.advance(i - 1);
    }
    return value;
};
