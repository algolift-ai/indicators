// packages/indicators/src/formulas/candlestick_patterns/cdl_3whitesoldiers.ts
//
// Three Advancing White Soldiers: the formula, ported from TA-Lib's ta_CDL3WHITESOLDIERS.c.
// Held to its oracle fixture, cdl_3whitesoldiers.json. PURE.

import { candleColor, CandleTotal, maxAvgPeriod, patternFrame, realBody, upperShadow } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('ShadowVeryShort', 'BodyShort', 'Far', 'Near') + 2);
    // ShadowVeryShort on each soldier (i - 2, i - 1, i); Near and Far on the first two; BodyShort on the third.
    const vs2 = new CandleTotal(bars, 'ShadowVeryShort', start - 2);
    const vs1 = new CandleTotal(bars, 'ShadowVeryShort', start - 1);
    const vs0 = new CandleTotal(bars, 'ShadowVeryShort', start);
    const near2 = new CandleTotal(bars, 'Near', start - 2);
    const near1 = new CandleTotal(bars, 'Near', start - 1);
    const far2 = new CandleTotal(bars, 'Far', start - 2);
    const far1 = new CandleTotal(bars, 'Far', start - 1);
    const short = new CandleTotal(bars, 'BodyShort', start);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            candleColor(b1) === 1 &&
            upperShadow(b1) < vs2.average(i - 2) &&
            candleColor(b2) === 1 &&
            upperShadow(b2) < vs1.average(i - 1) &&
            candleColor(b3) === 1 &&
            upperShadow(b3) < vs0.average(i) &&
            b3.close > b2.close &&
            b2.close > b1.close &&
            b2.open > b1.open &&
            b2.open <= b1.close + near2.average(i - 2) &&
            b3.open > b2.open &&
            b3.open <= b2.close + near1.average(i - 1) &&
            realBody(b2) > realBody(b1) - far2.average(i - 2) &&
            realBody(b3) > realBody(b2) - far1.average(i - 1) &&
            realBody(b3) > short.average(i)
        )
            value[i] = 100;
        vs2.advance(i - 2);
        vs1.advance(i - 1);
        vs0.advance(i);
        far2.advance(i - 2);
        near2.advance(i - 2);
        far1.advance(i - 1);
        near1.advance(i - 1);
        short.advance(i);
    }
    return value;
};
