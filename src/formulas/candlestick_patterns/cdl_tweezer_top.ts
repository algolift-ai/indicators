// packages/indicators/src/formulas/candlestick_patterns/cdl_tweezer_top.ts
//
// Tweezer Top: the formula, ported from technicalindicators' candlestick/TweezerTop.
// Held to its oracle fixture, cdl_tweezer_top.json. PURE.

import type { PatternFormula } from '../../types';
import { tweezer } from './_tweezer';

/** The pattern's value on every bar (positive bullish, negative bearish, 0 none), null in its lookback. */
export const compute: PatternFormula = (bars) => tweezer(bars, true);
