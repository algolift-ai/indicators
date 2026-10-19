// packages/indicators/src/formulas/candlestick_patterns/cdl_haramicross.ts
//
// Harami Cross: the formula, ported from TA-Lib's ta_CDLHARAMICROSS.c.
// Held to its oracle fixture, cdl_haramicross.json. PURE.

import { candleColor, CandleTotal, cmax, cmin, maxAvgPeriod, patternFrame, realBody } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyDoji', 'BodyLong') + 1);
    // The long body is judged at i - 1, the doji at i.
    const long = new CandleTotal(bars, 'BodyLong', start - 1);
    const doji = new CandleTotal(bars, 'BodyDoji', start);
    for (let i = start; i < bars.length; i++) {
        const p = bars[i - 1];
        const b = bars[i];
        if (realBody(p) > long.average(i - 1) && realBody(b) <= doji.average(i)) {
            if (cmax(b.close, b.open) < cmax(p.close, p.open) && cmin(b.close, b.open) > cmin(p.close, p.open)) {
                value[i] = -candleColor(p) * 100;
            } else if (cmax(b.close, b.open) <= cmax(p.close, p.open) && cmin(b.close, b.open) >= cmin(p.close, p.open)) {
                value[i] = -candleColor(p) * 80;
            }
        }
        long.advance(i - 1);
        doji.advance(i);
    }
    return value;
};
