// packages/indicators/src/formulas/candlestick_patterns/cdl_mathold.ts
//
// Mat Hold: the formula, ported from TA-Lib's ta_CDLMATHOLD.c.
// Held to its oracle fixture, cdl_mathold.json. PURE.

import { candleColor, CandleTotal, cmax, cmin, maxAvgPeriod, patternFrame, realBody, realBodyGapUp } from '../../core/candles';
import { readPenetration } from '../../core/pattern';
import { nulls } from '../../core/shared';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars, config) => {
    const penetration = readPenetration(config, 0.5);
    if (penetration === null) return nulls(bars.length);
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyShort', 'BodyLong') + 4);
    // The C's BodyPeriodTotal[5]: BodyLong at i - 4, BodyShort at i - 3, i - 2, i - 1 ([0] is never used).
    const long4 = new CandleTotal(bars, 'BodyLong', start - 4);
    const short3 = new CandleTotal(bars, 'BodyShort', start - 3);
    const short2 = new CandleTotal(bars, 'BodyShort', start - 2);
    const short1 = new CandleTotal(bars, 'BodyShort', start - 1);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 4];
        const b2 = bars[i - 3];
        const b3 = bars[i - 2];
        const b4 = bars[i - 1];
        const b5 = bars[i];
        if (
            candleColor(b1) === 1 &&
            candleColor(b2) === -1 &&
            candleColor(b5) === 1 &&
            realBodyGapUp(b2, b1) &&
            cmin(b3.open, b3.close) < b1.close &&
            cmin(b4.open, b4.close) < b1.close &&
            cmin(b3.open, b3.close) > b1.close - realBody(b1) * penetration &&
            cmin(b4.open, b4.close) > b1.close - realBody(b1) * penetration &&
            cmax(b3.close, b3.open) < b2.open &&
            cmax(b4.close, b4.open) < cmax(b3.close, b3.open) &&
            b5.open > b4.close &&
            b5.close > cmax(cmax(b2.high, b3.high), b4.high) &&
            realBody(b1) > long4.average(i - 4) &&
            realBody(b2) < short3.average(i - 3) &&
            realBody(b3) < short2.average(i - 2) &&
            realBody(b4) < short1.average(i - 1)
        )
            value[i] = 100;
        long4.advance(i - 4);
        short3.advance(i - 3);
        short2.advance(i - 2);
        short1.advance(i - 1);
    }
    return value;
};
