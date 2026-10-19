// packages/indicators/src/formulas/volume/pvi.ts
//
// Positive Volume Index (PVI): the formula, ported from pandas-ta-classic's volume/pvi.py.
// Held to its oracle fixture, pvi.json. PURE.

import type { Formula } from '../../types';
import { volumeIndex } from './nvi';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => ({ value: volumeIndex(bars, config, (v, prev) => v > prev) });
