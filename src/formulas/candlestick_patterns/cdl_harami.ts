// packages/indicators/src/formulas/candlestick_patterns/cdl_harami.ts
//
// Harami: the formula, ported from TA-Lib's ta_CDLHARAMI.c.
// Held to its oracle fixture, cdl_harami.json. PURE.

import { candleColor, CandleTotal, cmax, cmin, maxAvgPeriod, patternFrame, realBody } from '../../core/candles';
import type { PatternFormula } from '../../types';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => {
    const { value, start } = patternFrame(bars.length, maxAvgPeriod('BodyShort', 'BodyLong') + 1);
    // The long body is judged at i - 1, the short one at i.
    const long = new CandleTotal(bars, 'BodyLong', start - 1);
    const short = new CandleTotal(bars, 'BodyShort', start);
    for (let i = start; i < bars.length; i++) {
        const p = bars[i - 1];
        const b = bars[i];
        if (realBody(p) > long.average(i - 1) && realBody(b) <= short.average(i)) {
            if (cmax(b.close, b.open) < cmax(p.close, p.open) && cmin(b.close, b.open) > cmin(p.close, p.open)) {
                value[i] = -candleColor(p) * 100;
            } else if (cmax(b.close, b.open) <= cmax(p.close, p.open) && cmin(b.close, b.open) >= cmin(p.close, p.open)) {
                value[i] = -candleColor(p) * 80;
            }
        }
        long.advance(i - 1);
        short.advance(i);
    }
    return value;
};
