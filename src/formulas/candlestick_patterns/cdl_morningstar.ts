// packages/indicators/src/formulas/candlestick_patterns/cdl_morningstar.ts
//
// Morning Star: the formula, ported from TA-Lib's ta_CDLMORNINGSTAR.c.
// Held to its oracle fixture, cdl_morningstar.json. PURE.

import { candleColor, CandleTotal, fma, maxAvgPeriod, patternFrame, realBody, realBodyGapDown } from '../../core/candles';
import { readPenetration } from '../../core/pattern';
import { nulls } from '../../core/shared';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars, config) => {
    const penetration = readPenetration(config, 0.3);
    if (penetration === null) return nulls(bars.length);
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyShort', 'BodyLong') + 2);
    // The first candle's body is judged at i - 2, the star's at i - 1, the last candle's at i.
    const long = new CandleTotal(bars, 'BodyLong', start - 2);
    const short = new CandleTotal(bars, 'BodyShort', start - 1);
    const short2 = new CandleTotal(bars, 'BodyShort', start);
    for (let i = start; i < bars.length; i++) {
        const b1 = bars[i - 2];
        const b2 = bars[i - 1];
        const b3 = bars[i];
        if (
            candleColor(b1) === -1 &&
            candleColor(b3) === 1 &&
            realBodyGapDown(b2, b1) &&
            b3.close > fma(realBody(b1), penetration, b1.close) &&
            realBody(b1) > long.average(i - 2) &&
            realBody(b2) <= short.average(i - 1) &&
            realBody(b3) > short2.average(i)
        ) value[i] = 100;
        long.advance(i - 2);
        short.advance(i - 1);
        short2.advance(i);
    }
    return value;
};
