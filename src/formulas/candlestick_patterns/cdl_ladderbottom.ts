// packages/indicators/src/formulas/candlestick_patterns/cdl_ladderbottom.ts
//
// Ladder Bottom: the formula, ported from TA-Lib's ta_CDLLADDERBOTTOM.c.
// Held to its oracle fixture, cdl_ladderbottom.json. PURE.

import { avgPeriod, candleColor, CandleTotal, patternFrame, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, avgPeriod('ShadowVeryShort') + 4);
    // The fourth candle's upper shadow is judged at i - 1.
    const shadow = new CandleTotal(bars, 'ShadowVeryShort', start - 1);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 4];
        const b2 = bars[i - 3];
        const b3 = bars[i - 2];
        const b4 = bars[i - 1];
        const b5 = bars[i];
        if (
            candleColor(b1) === -1 &&
            candleColor(b2) === -1 &&
            candleColor(b3) === -1 &&
            b1.open > b2.open &&
            b2.open > b3.open &&
            b1.close > b2.close &&
            b2.close > b3.close &&
            candleColor(b4) === -1 &&
            upperShadow(b4) > shadow.average(i - 1) &&
            candleColor(b5) === 1 &&
            b5.open > b4.open &&
            b5.close > b4.high
        ) value[i] = 100;
        shadow.advance(i - 1);
    }
    return value;
};
