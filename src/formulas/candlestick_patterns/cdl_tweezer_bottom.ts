// packages/indicators/src/formulas/candlestick_patterns/cdl_tweezer_bottom.ts
//
// Tweezer Bottom: the formula, ported from technicalindicators' candlestick/TweezerBottom.
// Held to its oracle fixture, cdl_tweezer_bottom.json. PURE.

import type { PatternFormula } from '../../types';
import { tweezer } from './_tweezer';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => tweezer(bars, false);
