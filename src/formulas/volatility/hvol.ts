// packages/indicators/src/formulas/volatility/hvol.ts
//
// Historical Volatility (annualised): the formula, ported from pandas-ta-classic's volatility/hvol.py.
// Held to its oracle fixture, hvol.json. PURE.

import { pandasRollingVar, toOutput } from '../../core/libmath';
import { intSetting, nulls, numSetting, readSource } from '../../core/shared';
import type { Formula, OracleTerms } from '../../types';

/** Every output, one value per bar. */
export const compute: Formula = (bars, config) => {
    const n = bars.length;
    const period = intSetting(config.period, 20, 2);
    const annualization = numSetting(config.annualization, 252, 0, Infinity, { openMin: true });
    if (period === null || annualization === null) return { value: nulls(n) };
    const ddof = config.estimator === 'population' ? 0 : 1;
    const x = readSource(bars, config);
    const logReturns = x.map((v, i) => (i === 0 ? NaN : Math.log(v / x[i - 1])));
    const scale = Math.sqrt(annualization);
    // pandas' rolling standard deviation, whose square root reads a tiny negative variance as 0.
    const value = pandasRollingVar(logReturns, period, ddof).map((v) => 100 * (v < 0 ? 0 : Math.sqrt(v)) * scale);
    return { value: toOutput(value) };
};

/** How it meets pandas-ta-classic's fixture: a window with no movement within 1e-6 absolute. */
export const oracle: OracleTerms = {
    atol: 1e-6,
    reason: "Over a window with no movement the true volatility is 0, but pandas' rolling variance leaves a rounding residue there (about 1e-18) that the square root lifts to about 1e-7, and its last bits depend on the processor. The fixture records the exact 0 (the oracle writes a value under 1e-4 as 0), and this formula, which keeps pandas' algorithm, still reads the residue: 1e-6 absolute holds that, against volatilities from 3 to 35.",
};
