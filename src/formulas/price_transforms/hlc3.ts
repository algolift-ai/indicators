// packages/indicators/src/formulas/price_transforms/hlc3.ts
//
// Typical Price (HLC3): the formula, ported from TA-Lib's ta_TYPPRICE.c.
// Held to its oracle fixture, hlc3.json. PURE.

import type { Formula } from '../../types';
import { perBar } from './_local';

/** Every output, one value per bar. */
export const compute: Formula = perBar((b) => (b.high + b.low + b.close) / 3.0);
