// packages/indicators/src/formulas/momentum/squeeze_pro.ts
//
// Squeeze Pro: the formula, ported from pandas-ta-classic's momentum/squeeze_pro.py.
// Held to its oracle fixture, squeeze_pro.json. PURE.

import { toOutput } from '../../core/libmath';
import { nulls } from '../../core/shared';
import type { Formula, OracleTerms } from '../../types';
import { compare, positiveSetting, squeezeBase, state } from './squeeze';

const OUTPUTS = ['value', 'on_wide', 'on_normal', 'on_narrow', 'off', 'no'] as const;

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const empty = Object.fromEntries(OUTPUTS.map((o) => [o, nulls(n)]));
    const base = squeezeBase(bars, config);
    const wide = positiveSetting(config.kc_wide, 2.0);
    const normal = positiveSetting(config.kc_normal, 1.5);
    const narrow = positiveSetting(config.kc_narrow, 1.0);
    if (!base || wide === null || normal === null || narrow === null || !(wide > normal && normal > narrow)) return empty;
    const w = compare(base, wide);
    return {
        value: toOutput(base.momentum),
        on_wide: state(w.on, base.start),
        on_normal: state(compare(base, normal).on, base.start),
        on_narrow: state(compare(base, narrow).on, base.start),
        off: state(w.off, base.start),
        no: state(w.on.map((o, i) => !o && !w.off[i]), base.start),
    };
};

/** How it meets its oracle fixture, beyond the default comparison. */
export const oracle: OracleTerms = {
    skipLeading: (c) => Math.max(Number(c.bb_period) - 1, Number(c.kc_period)),
    reason: "pandas-ta-classic writes the squeeze states from the first bar, comparing bands and channels that do not exist yet (a comparison with NaN reads false, so 'no squeeze' reads 1); the spec writes null until both exist. The skip covers every output, so the momentum's first values go uncompared there; every later one is compared.",
};
