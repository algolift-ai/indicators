// packages/indicators/src/core/pattern.ts
//
// What the candlestick patterns read besides the candle machinery: the
// `penetration` setting (TA-Lib's `optInPenetration`). PURE.

import { numSetting } from './shared';

/** The penetration a config asks for, or null (the pattern then returns all nulls) outside 0 to 1. */
export function readPenetration(config: Record<string, any>, fallback: number): number | null {
    return numSetting(config.penetration, fallback, 0, 1);
}
