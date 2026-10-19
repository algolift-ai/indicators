// packages/indicators/src/types.ts
//
// The shapes every formula reads and writes. PURE (types only).

/** One bar, oldest first in any array of them. */
export interface Bar {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

/**
 * The bar a formula reads. The same shape as `Bar`; the name is the one the
 * formulas were written with (a caller may pass bars carrying more fields).
 */
export type SpecBar = Bar;

/** One value per bar, oldest first, null where the indicator has no value (its warmup, or a division it cannot make). */
export type Series = (number | null)[];

/** The formulas' own name for a `Series`. */
export type DataArray = Series;

/**
 * A formula: every output of one indicator, one value per bar, from bars and
 * settings. A setting left out reads as its default; one the formula cannot
 * use (a period below its minimum) makes every output null, never a throw.
 */
export type Formula = (bars: SpecBar[], config: Record<string, any>) => Record<string, Series>;

/** A candlestick pattern's formula: its one output, `value`. */
export type PatternFormula = (bars: SpecBar[], config: Record<string, any>) => Series;

/** The licenses a ported formula comes under. */
export type PortLicense = 'BSD-3-Clause' | 'MIT' | 'Apache-2.0';

/** Where a formula's code came from: a port's library, version, license and changes, or a classic AlgoLift wrote. */
export type Provenance = PortProvenance | ClassicProvenance;

/** A port: the library, its version and license, and what the port changed. */
export interface PortProvenance {
    origin: 'ported';
    license: PortLicense;
    library: string;
    version: string;
    url: string;
    /** The copyright line exactly as the library's LICENSE states it. */
    copyright: string;
    /** The file or function ported, as the library names it. */
    entry: string;
    /** Every way the port differs from the source. */
    changes?: string;
}

/**
 * A classic indicator AlgoLift wrote for its strategy nodes (SMA, EMA, RSI,
 * MACD, Bollinger Bands, ATR and the rest TA-Lib also computes), under this
 * package's MIT license, and how it compares with TA-Lib.
 */
export interface ClassicProvenance {
    origin: 'algolift';
    license: 'MIT';
    author: string;
    /** The idea it computes, cited where it has an author. */
    concept?: string;
    talib: {
        library: 'TA-Lib';
        version: string;
        /** The TA-Lib function or functions it was compared with. */
        functions: string;
        /**
         * `match`: every output TA-Lib computes agrees with TA-Lib on the fixture,
         * which is TA-Lib's own. `convention`: it differs by the conventions in
         * `differences`, and its fixture is its own output.
         */
        result: 'match' | 'convention';
        /** Every way it differs from TA-Lib: a seed, a warmup, a zero range, a default, an output TA-Lib does not compute. */
        differences: string[];
    };
}

/**
 * How a formula meets its oracle fixture, when it does not meet the default
 * comparison (every value within relative 1e-9, absolute 1e-12 near zero, and
 * a null exactly where the library has none). `reason` names the difference.
 */
export interface OracleTerms {
    /** Relative tolerance, when 1e-9 is not met for a stated reason. */
    rtol?: number;
    /** Absolute tolerance near zero, when 1e-12 is not met for a stated reason. */
    atol?: number;
    /** Bars at the start where the formula and the library may differ (a different warmup convention), or a function of the settings. */
    skipLeading?: number | ((config: Record<string, any>) => number);
    /** No fixture exists. */
    none?: true;
    reason: string;
}

// ------------------------------------------------------------------ the catalog

/** A bar's fields, as an indicator reads them. */
export type BarField = 'open' | 'high' | 'low' | 'close' | 'volume';

/** The indicator families, as the catalog groups them. */
export type Family =
    | 'moving_averages'
    | 'price_transforms'
    | 'momentum'
    | 'trend_strength'
    | 'volatility'
    | 'bands_channels'
    | 'volume'
    | 'cycles'
    | 'statistics'
    | 'regression'
    | 'market_structure'
    | 'candlestick_patterns';

/** What the indicator draws: a line, an oscillator, bands, a level, an event, a state or candles. */
export type Kind = 'line' | 'osc' | 'bands' | 'level' | 'event' | 'state' | 'candles' | 'profile';

/** A number setting: its default and the range it is offered and tested in. */
export interface NumberParameter {
    name: string;
    label: string;
    type: 'number';
    default: number;
    /** The smallest value the formula takes; below it every output is null (`calculate` refuses it). */
    min?: number;
    /** The largest value offered and tested; a larger one is computed as written. */
    max?: number;
    step?: number;
    description?: string;
}

/** A setting with named choices (the `source` setting: which value of each bar to read). */
export interface ChoiceParameter {
    name: string;
    label: string;
    type: 'choice';
    default: string;
    options: { value: string; label: string }[];
    description?: string;
}

export type Parameter = NumberParameter | ChoiceParameter;

/** One output: an array of one value per bar. */
export interface Output {
    name: string;
    label: string;
    description?: string;
}

/** What the catalog says about one indicator. */
export interface IndicatorInfo {
    /** The catalog id (`wma`, `cdl_engulfing`), also its fixture's name. */
    id: string;
    /** The function that computes it (`wma`, `cdlEngulfing`). */
    fn: string;
    name: string;
    description: string;
    /** Other names it is known by. */
    aliases?: string[];
    family: Family;
    kind: Kind;
    parameters: Parameter[];
    outputs: Output[];
    /** The bar fields it reads at its defaults, besides the `source` setting's. */
    reads: BarField[];
    /** The library and function it was ported from, the license, and every change; or, for a classic, how it compares with TA-Lib. */
    provenance: Provenance;
    /** What its fixture was computed by. */
    verifiedAgainst: string;
    /** Where its comparison with the library is not the default one, why (a different warmup convention, a rounding). */
    oracleNote?: string;
}
