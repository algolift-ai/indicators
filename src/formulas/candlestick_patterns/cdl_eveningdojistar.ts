// packages/indicators/src/formulas/candlestick_patterns/cdl_eveningdojistar.ts
//
// Evening Doji Star: the formula, ported from TA-Lib's ta_CDLEVENINGDOJISTAR.c.
// Held to its oracle fixture, cdl_eveningdojistar.json. PURE.

import { candleColor, CandleTotal, maxAvgPeriod, patternFrame, realBody, realBodyGapUp } from '../../core/candles';
import { readPenetration } from '../../core/pattern';
import { nulls } from '../../core/shared';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars, config) => {
    const penetration = readPenetration(config, 0.3);
    if (penetration === null) return nulls(bars.length);
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyDoji', 'BodyLong', 'BodyShort') + 2);
    // The first candle's body is judged at i - 2, the doji's at i - 1, the last candle's at i.
    const long = new CandleTotal(bars, 'BodyLong', start - 2);
    const doji = new CandleTotal(bars, 'BodyDoji', start - 1);
    const short = new CandleTotal(bars, 'BodyShort', start);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            candleColor(b1) === 1 &&
            candleColor(b3) === -1 &&
            realBodyGapUp(b2, b1) &&
            // Unlike the morning doji star, the C rounds the product and the difference separately here.
            b3.close < b1.close - realBody(b1) * penetration &&
            realBody(b1) > long.average(i - 2) &&
            realBody(b2) <= doji.average(i - 1) &&
            realBody(b3) > short.average(i)
        ) value[i] = -100;
        long.advance(i - 2);
        doji.advance(i - 1);
        short.advance(i);
    }
    return value;
};
