// packages/indicators/src/index.ts
//
// @algolift/indicators: technical indicators ported from TA-Lib,
// pandas-ta-classic, pandas-ta and technicalindicators, each tested against
// the library's own output to the bit, and the classics AlgoLift wrote for
// its strategy nodes (SMA, EMA, RSI, MACD, Bollinger Bands, ATR and the rest),
// each compared with TA-Lib with every difference stated (the fixtures and
// the oracle that wrote them are in the repo).
//
//   import { wma, cdlEngulfing, catalog } from '@algolift/indicators';
//   const { value } = wma(bars, { period: 20 });
//
// Every function takes bars (oldest first) or columns of open, high, low,
// close and volume, and returns its outputs: one value per bar, null where
// the indicator has no value yet.

export * from './api';
export { CATALOG, CATALOG as catalog } from './catalog';
export type { IndicatorId } from './catalog';
export { FORMULAS } from './formulas';
export type { FormulaEntry } from './formulas';
export { calculate, info, settings, toBars } from './run';
export type { OhlcvColumns, OhlcvInput, Options } from './run';
export type {
    Bar,
    BarField,
    ChoiceParameter,
    ClassicProvenance,
    DataArray,
    Family,
    Formula,
    IndicatorInfo,
    Kind,
    NumberParameter,
    OracleTerms,
    Output,
    Parameter,
    PatternFormula,
    PortLicense,
    PortProvenance,
    Provenance,
    Series,
    SpecBar,
} from './types';
