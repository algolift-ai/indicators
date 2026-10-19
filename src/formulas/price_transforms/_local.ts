// packages/indicators/src/formulas/price_transforms/_local.ts
//
// What the four bar transforms (hl2, hlc3, ohlc4, wcp) share: one value per
// bar from that bar's own fields. Not an indicator. PURE.

import type { Formula, SpecBar } from '../../types';

/** One value per bar, from that bar alone: no warmup, no settings. */
export function perBar(f: (b: SpecBar) => number): Formula {
    return (bars) => ({ value: bars.map(f) });
}
