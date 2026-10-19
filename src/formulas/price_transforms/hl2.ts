// packages/indicators/src/formulas/price_transforms/hl2.ts
//
// Median Price (HL2): the formula, ported from TA-Lib's ta_MEDPRICE.c.
// Held to its oracle fixture, hl2.json. PURE.

import type { Formula } from '../../types';
import { perBar } from './_local';

/** Every output, one value per bar. */
export const compute: Formula = perBar((b) => (b.high + b.low) / 2.0);
