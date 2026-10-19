// packages/indicators/src/formulas/candlestick_patterns/cdl_spinningtop.ts
//
// Spinning Top: the formula, ported from TA-Lib's ta_CDLSPINNINGTOP.c.
// Held to its oracle fixture, cdl_spinningtop.json. PURE.

import { avgPeriod, candleColor, CandleTotal, lowerShadow, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, avgPeriod('BodyShort'));
    const body = new CandleTotal(bars, 'BodyShort', start);
    for (let i = start; i < bars.length; i++) {
        const b = bars[i];
        const rb = realBody(b);
        if (upperShadow(b) > rb && lowerShadow(b) > rb && rb < body.average(i)) value[i] = candleColor(b) * 100;
        body.advance(i);
    }
    return value;
};
