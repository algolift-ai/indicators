// packages/indicators/src/formulas/price_transforms/wcp.ts
//
// Weighted Close Price: the formula, ported from TA-Lib's ta_WCLPRICE.c.
// Held to its oracle fixture, wcp.json. PURE.

import type { Formula } from '../../types';
import { perBar } from './_local';

/** Every output, one value per bar. */
export const compute: Formula = perBar((b) => (b.close * 2.0 + (b.high + b.low)) / 4.0);
