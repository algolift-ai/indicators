// packages/indicators/src/formulas/candlestick_patterns/cdl_darkcloudcover.ts
//
// Dark Cloud Cover: the formula, ported from TA-Lib's ta_CDLDARKCLOUDCOVER.c.
// Held to its oracle fixture, cdl_darkcloudcover.json. PURE.

import { candleColor, CandleTotal, maxAvgPeriod, patternFrame, realBody } from '../../core/candles';
import { readPenetration } from '../../core/pattern';
import { nulls } from '../../core/shared';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars, config) => {
    const penetration = readPenetration(config, 0.5);
    if (penetration === null) return nulls(bars.length);
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyLong') + 1);
    // The long body is judged on the first candle.
    const long = new CandleTotal(bars, 'BodyLong', start - 1);
    for (let i = start; i < bars.length; i++) {
        const p = bars[i - 1];
        const b = bars[i];
        if (
            candleColor(p) === 1 &&
            realBody(p) > long.average(i - 1) &&
            candleColor(b) === -1 &&
            b.open > p.high &&
            b.close > p.open &&
            b.close < p.close - realBody(p) * penetration
        ) value[i] = -100;
        long.advance(i - 1);
    }
    return value;
};
