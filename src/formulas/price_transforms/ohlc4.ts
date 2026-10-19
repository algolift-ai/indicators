// packages/indicators/src/formulas/price_transforms/ohlc4.ts
//
// OHLC Average: the formula, ported from TA-Lib's ta_AVGPRICE.c.
// Held to its oracle fixture, ohlc4.json. PURE.

import type { Formula } from '../../types';
import { perBar } from './_local';

/** Every output, one value per bar. */
export const compute: Formula = perBar((b) => (b.high + b.low + b.close + b.open) / 4);
