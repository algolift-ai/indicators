// packages/indicators/src/core/shared.ts
//
// WHAT EVERY PORTED FORMULA SHARES (the 500-indicator plan, P2;
// plan/design/indicators/PORTING.md). One place for the conventions several
// family sessions would otherwise each write their own way: the `source`
// setting, reading a numeric setting, an all-null series, and the
// provenance of the two oracle libraries at their pinned versions.
//
// PURE.

import type { DataArray, PortProvenance, SpecBar } from '../types';

// ------------------------------------------------------------------ the source

/**
 * The bar value a single-input study reads. The arithmetic is written in the
 * order the oracle's (scripts/indicators/oracle/oraclelib.py SOURCES) is, so
 * the two agree to the bit.
 */
export const SOURCES = {
    open: (b: SpecBar) => b.open,
    high: (b: SpecBar) => b.high,
    low: (b: SpecBar) => b.low,
    close: (b: SpecBar) => b.close,
    hl2: (b: SpecBar) => (b.high + b.low) / 2.0,
    hlc3: (b: SpecBar) => (b.high + b.low + b.close) / 3.0,
    ohlc4: (b: SpecBar) => (b.open + b.high + b.low + b.close) / 4.0,
} as const;

export type SourceName = keyof typeof SOURCES;

/** The series the `source` setting names (close when unset or unknown). */
export function readSource(bars: readonly SpecBar[], config: Record<string, any>): number[] {
    const f = SOURCES[(config.source as SourceName) ?? 'close'] ?? SOURCES.close;
    return bars.map(f);
}

// ----------------------------------------------------------------- the settings

/**
 * A whole-number setting: the config's value, else the default, floored.
 * Returns null when the result is below `min`, and the formula then returns
 * all nulls (never a throw, never a guess).
 */
export function intSetting(value: unknown, fallback: number, min = 1): number | null {
    const v = value === undefined || value === null || value === '' ? fallback : Math.floor(Number(value));
    return Number.isFinite(v) && v >= min ? v : null;
}

/**
 * A decimal setting (a multiplier, a factor, an initial value): the config's
 * value, else the default. Null when it is outside [min, max] (an open end
 * with `openMin` / `openMax`), and the formula then returns all nulls, as
 * `intSetting` does for whole numbers.
 */
export function numSetting(
    value: unknown,
    fallback: number,
    min: number,
    max = Infinity,
    { openMin = false, openMax = false }: { openMin?: boolean; openMax?: boolean } = {},
): number | null {
    const v = value === undefined || value === null || value === '' ? fallback : Number(value);
    if (!Number.isFinite(v)) return null;
    if (openMin ? v <= min : v < min) return null;
    if (openMax ? v >= max : v > max) return null;
    return v;
}

/** A series of nulls, one per bar. */
export function nulls(n: number): DataArray {
    return new Array(n).fill(null);
}

// --------------------------------------------------------------- the provenance

/** TA-Lib at the version every ported spec was read from and is tested against. */
export const TALIB = {
    library: 'TA-Lib',
    version: '0.8.1',
    license: 'BSD-3-Clause',
    copyright: 'Copyright (c) 1999-2026, Mario Fortier',
} as const;

/**
 * A port of one TA-Lib C function (`ta_<FUNC>.c` at tag v0.8.1, the C library
 * the oracle's ta-lib 0.8.1 wheel bundles). `changes` says what differs from
 * the C, always at least the output alignment.
 */
export function talibPorted(func: string, changes: string): PortProvenance {
    return {
        origin: 'ported',
        license: TALIB.license,
        library: TALIB.library,
        version: TALIB.version,
        url: `https://github.com/TA-Lib/ta-lib/blob/v${TALIB.version}/src/ta_func/ta_${func}.c`,
        copyright: TALIB.copyright,
        entry: `ta_${func}.c`,
        changes,
    };
}

/** pandas-ta-classic at the version the oracle pins. Its LICENSE carries both lines. */
export const PANDAS_TA_CLASSIC = {
    library: 'pandas-ta-classic',
    version: '0.8.32',
    license: 'MIT',
    copyright: 'Copyright (c) 2021+ pandas-ta contributors\nCopyright (c) 2024+ pandas-ta-classic contributors (xgboosted/pandas-ta-classic)',
} as const;

/**
 * A port of one pandas-ta-classic module, `path` as the package names it
 * (`overlap/hma`, `momentum/qqe`), read from the 0.8.32 wheel.
 */
export function pandasTaClassicPorted(path: string, changes: string): PortProvenance {
    return {
        origin: 'ported',
        license: PANDAS_TA_CLASSIC.license,
        library: PANDAS_TA_CLASSIC.library,
        version: PANDAS_TA_CLASSIC.version,
        url: `https://pypi.org/project/pandas-ta-classic/${PANDAS_TA_CLASSIC.version}/`,
        copyright: PANDAS_TA_CLASSIC.copyright,
        entry: `pandas_ta_classic/${path}.py`,
        changes,
    };
}

/**
 * pandas-ta 0.4.71b0, the PyPI wheel (its GitHub repository is gone): only
 * for the rows the classic fork lacks (catalogue.csv `port_base`).
 */
export const PANDAS_TA = {
    library: 'pandas-ta',
    version: '0.4.71b0',
    license: 'MIT',
    copyright: 'Copyright (c) 2019+ Kevin Johnson',
} as const;

/** A port of one pandas-ta module, `path` as the package names it (`cycles/reflex`). */
export function pandasTaPorted(path: string, changes: string): PortProvenance {
    return {
        origin: 'ported',
        license: PANDAS_TA.license,
        library: PANDAS_TA.library,
        version: PANDAS_TA.version,
        url: `https://pypi.org/project/pandas-ta/${PANDAS_TA.version}/`,
        copyright: PANDAS_TA.copyright,
        entry: `pandas_ta/${path}.py`,
        changes,
    };
}

/**
 * technicalindicators 3.1.0 (npm, MIT): only for the two Tweezer patterns,
 * which no other source library has. No package in the oracle venv computes
 * it, so its ports are tested against an independent numpy version
 * (`concept_oracle`, PORTING.md § 15).
 */
export const TECHNICALINDICATORS = {
    library: 'technicalindicators',
    version: '3.1.0',
    license: 'MIT',
    copyright: 'Copyright (c) 2016 Anand Aravindan',
} as const;

/** A port of one technicalindicators module, `path` as the package names it (`candlestick/TweezerTop`). */
export function technicalindicatorsPorted(path: string, changes: string): PortProvenance {
    return {
        origin: 'ported',
        license: TECHNICALINDICATORS.license,
        library: TECHNICALINDICATORS.library,
        version: TECHNICALINDICATORS.version,
        url: `https://www.npmjs.com/package/technicalindicators/v/${TECHNICALINDICATORS.version}`,
        copyright: TECHNICALINDICATORS.copyright,
        entry: `lib/${path}.js`,
        changes,
    };
}

// ------------------------------------------------------------------- events

/**
 * One signed event series from a bullish and a bearish 1/0 pair, for the
 * chart's event markers (P3, `plotType: 'event_marker'`): +1 where the
 * bullish event fires, -1 where the bearish one does, 0 elsewhere, null where
 * both are null (the warmup).
 */
export function signedEvent(bull: readonly (number | null)[], bear: readonly (number | null)[]): DataArray {
    return bull.map((b, i) => {
        const s = bear[i];
        if (b === null && s === null) return null;
        if (b) return 1;
        if (s) return -1;
        return 0;
    });
}
