// A consumer of the built package from CommonJS, type-checked under Node's resolution.
import { catalog, wma, type Series } from '@algolift/indicators';

const averaged: { value: Series } = wma([{ open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 }], { period: 1 });

export = { averaged, count: catalog.length };
