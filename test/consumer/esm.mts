// A consumer of the built package from an ES module, type-checked under Node's resolution.
import { calculate, catalog, cdlEngulfing, wma, type IndicatorInfo, type Series } from '@algolift/indicators';

const bars = [{ open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 }];
const averaged: { value: Series } = wma(bars, { period: 1, source: 'hl2' });
const engulfing: { value: Series } = cdlEngulfing({ open: [1], high: [2], low: [0], close: [1] });
const first: IndicatorInfo = catalog[0];
const any: Record<string, Series> = calculate('wma', bars, { period: 3 });
// @ts-expect-error: wma has no option `length`.
wma(bars, { length: 3 });

export { any, averaged, engulfing, first };
