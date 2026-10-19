# @algolift/indicators

Technical indicators in TypeScript, each one tested against TA-Lib, pandas-ta-classic or pandas-ta to the bit, with the fixtures in the repo.

217 indicators (24 classics written by AlgoLift and compared with TA-Lib, 92 ported from TA-Lib, 86 ported from pandas-ta-classic, 13 ported from pandas-ta, 2 ported from technicalindicators): moving averages, momentum, trend strength, volatility, bands, volume, cycles, statistics, regression, and the 61 TA-Lib candlestick patterns plus two Tweezers. The classics (SMA, EMA, RSI, MACD, Bollinger Bands, ATR and the rest TA-Lib also computes) are AlgoLift's own, the formulas its strategy nodes run, each compared with TA-Lib with every difference stated ([below](#the-classic-indicators)). Every other one was ported from an open-source library's code and is checked, value by value, against that library's own output.

This is the code [AlgoLift](https://algolift.ai) runs in the browser: the platform's charts and studies import this package, so there is one copy of each formula. Where an indicator is also a strategy node, the backtest engine's Python twin is held to the same fixtures.

## Install

```bash
npm install @algolift/indicators
```

ES module and CommonJS builds, TypeScript declarations included, no dependencies.

## Use

```ts
import { wma, rma, squeeze, cdlEngulfing, calculate, catalog } from '@algolift/indicators';

// Bars, oldest first.
const bars = [
    { open: 101.2, high: 102.0, low: 100.8, close: 101.6, volume: 1200 },
    // ...
];

const { value } = wma(bars, { period: 20 });                 // (number | null)[], one per bar
const { value: smoothed } = rma(bars, { period: 14, source: 'hlc3' });
const { value: momentum, on, off } = squeeze(bars);          // the library's defaults
const { value: engulfing } = cdlEngulfing(bars);             // 100, -100, 80, -80 or 0

// Columns work too; leave out what the indicator does not read.
const { value: closeOnly } = wma({ close: [101.6, 101.9, 102.4] }, { period: 2 });

// Any indicator by id, and what the catalog knows about it.
const out = calculate('kst', bars, { signal: 9 });          // { value, signal }
const kst = catalog.find((i) => i.id === 'kst');             // name, settings, outputs, provenance
```

What you get back:

- **One value per bar**, in the input's order, as `(number | null)[]`. `null` where the indicator has no value: its warmup (the library's own, bar for bar), or a division it cannot make. Never `NaN`, never an infinity.
- **Defaults are the library's.** TA-Lib's WMA defaults to 30 bars, so `wma(bars)` does too. The classics keep the defaults of AlgoLift's strategy nodes (`sma(bars)` is 20 bars, TA-Lib's is 30), each stated in its catalog entry. Each function's options type lists every setting with its default and range.
- **Mistakes throw** instead of returning numbers: an unknown option, a choice that is not offered, a number below its minimum, columns of different lengths, or a column the indicator reads and the input does not have (`hl2 reads high, which the input does not have`).
- **Your input is never changed.**

## What "verified" means

Every indicator has a fixture, `fixtures/<id>.json`: the library's own output on 400 fixed bars (`fixtures/_bars.json`: a trend, a flat stretch with zero volume and zero range, a 5% gap, a spike) at three or more settings, the first being the defaults. The test suite computes every case with this package and compares every bar:

- a `null` exactly where the library has no value, and a number where it has one;
- every number within a relative 1e-9 of the library's (1e-12 absolute near zero). Most match bit for bit; the tolerance only covers a different order of additions, such as a window summed directly where TA-Lib keeps running totals;
- the candlestick patterns also match TA-Lib exactly, with no tolerance, on 8,000 seeded bars built to form every pattern (`fixtures/candlestick_stress.json`).

The libraries were pinned: TA-Lib 0.8.1 (its C library), pandas-ta-classic 0.8.32, pandas-ta 0.4.71b0, with numpy 2.2.6, pandas 3.0.6 and Python 3.12. The generator that wrote every fixture is in `oracle/`, with those pins; CI runs it and checks that every fixture comes back byte for byte, and runs the test suite on Node LTS.

A classic that differs from TA-Lib by a convention has its own fixture instead: its formula's output on the cases TA-Lib was compared on, with TA-Lib's beside it in `fixtures/talib/`, so its numbers are pinned and the difference is on record.

A few comparisons differ from the default, each for a reason the catalog states (`oracleNote`):

- `stc` (Schaff Trend Cycle (STC)): pandas-ta-classic's STC and its stochastic start at 0 on the first bar, before its MACD exists; the spec writes null until the first full window of the MACD and the library's own values (computed from the same zero start) after it. The skip covers every output, so the MACD's first cycle - 1 values go uncompared; every later one is compared.
- `squeeze` (Squeeze Momentum): pandas-ta-classic writes the squeeze states from the first bar, comparing bands and channels that do not exist yet (a comparison with NaN reads false, so 'no squeeze' reads 1); the spec writes null until both exist. The skip covers every output, so the momentum's first values go uncompared there; every later one is compared.
- `squeezePro` (Squeeze Pro): pandas-ta-classic writes the squeeze states from the first bar, comparing bands and channels that do not exist yet (a comparison with NaN reads false, so 'no squeeze' reads 1); the spec writes null until both exist. The skip covers every output, so the momentum's first values go uncompared there; every later one is compared.
- `amat` (Archer Moving Averages Trends (AMAT)): The library writes 0 (no run) on the bars before both EMAs have a value the lookback's bars back, because a comparison with its NaN reads false; the study writes null there, since no run can be judged yet.
- `trendBars` (Trend Bars (six-bar trend)): The library writes -1 (a down bar) on the first period - 1 bars, where its average midpoint is NaN and the comparison reads false; the study writes null there, since no bar can be judged before n midpoints exist.
- `htTrendmode` (Hilbert Transform Trend vs Cycle Mode): The Python wrapper fills an integer output's first 63 bars (TA-Lib's lookback, where the C writes nothing) with 0 rather than NaN, which would read as cycle mode; the study writes null there.
- `hvol` (Historical Volatility (annualised)): Over a window with no movement the true volatility is 0, but pandas' rolling variance leaves a rounding residue there (about 1e-18) that the square root lifts to about 1e-7, and its last bits depend on the processor. The fixture records the exact 0 (the oracle writes a value under 1e-4 as 0), and this formula, which keeps pandas' algorithm, still reads the residue: 1e-6 absolute holds that, against volatilities from 3 to 35.
- `stderr` (Standard Error): The library calls pandas' Series.rolling(n).std, which updates the window by adding and removing one value at a time; its rounding reaches 3.6e-8 relative where the spread is tiny next to the level (bar 211 at period 14, a window mostly on the flat bars 200 to 214). The spec computes each window directly and is within 4e-16 of the exact value on every fixture bar (checked with exact rational arithmetic), so the gap is pandas' error, not the spec's.
- `linreg` (Linear Regression): The slope is a difference of two large sums (n times the sum of x times y, less the sum of x times the sum of y), so near zero it keeps only a few digits of them. TA-Lib counts x back from the newest bar and this formula forward from the oldest, so the two cancel in different orders and differ by up to 3e-12 absolute where the slope is near zero; the formula keeps its order, because it is the strategy node's and its numbers never change.

The two Tweezers are ported from technicalindicators 3.1.0, a JavaScript library no Python package computes; their fixtures come from an independent numpy implementation of the library's rule, written from its definition.

Each port's changes from its source (output aligned to the input bars, a `source` setting added, a quirk not copied) are listed in its `provenance.changes`.

## The classic indicators

The classics are AlgoLift's own formulas, the ones its strategy nodes and charts compute, so their numbers never change to suit a library. Each was compared with TA-Lib 0.8.1 on the same 400 bars at three or more settings. Where every output TA-Lib computes agrees to the tolerance above, the fixture is TA-Lib's and the result is "matches". Where they differ by a convention (a seed, a warmup, what a window with no range reads), the result is "a convention": the fixture is the formula's own output, TA-Lib's is in `fixtures/talib/`, and the difference is stated here and in the catalog entry's `provenance.talib`. Outputs TA-Lib does not compute (a slope, a signal line) and defaults that differ from TA-Lib's are listed too.

| Function | Indicator | Compared with | Result | How it differs from TA-Lib |
|---|---|---|---|---|
| `sma` | SMA | TA-Lib `SMA` | matches | Defaults to 20 bars (TA-Lib's SMA: 30). Adds slope, each bar's change in the value, which TA-Lib does not compute. |
| `ema` | EMA | TA-Lib `EMA` | matches | Defaults to 20 bars (TA-Lib's EMA: 30). Seeded, as TA-Lib's is, with the simple average of the first period values. Adds slope, each bar's change in the value, which TA-Lib does not compute. |
| `dema` | DEMA (Double EMA) | TA-Lib `DEMA` | matches | Defaults to 14 bars (TA-Lib's DEMA: 30). Adds slope, each bar's change in the value, which TA-Lib does not compute. |
| `tema` | TEMA (Triple EMA) | TA-Lib `TEMA` | matches | Defaults to 14 bars (TA-Lib's TEMA: 30). Adds slope, each bar's change in the value, which TA-Lib does not compute. |
| `kama` | Kaufman's Adaptive MA (KAMA) | TA-Lib `KAMA` | a convention | Starts from the average of the period values before its first bar; TA-Lib's KAMA starts from the one value just before it. The values differ at the start and the difference shrinks every bar as the average forgets its start (on the fixture's bars it is gone by bar 340 at the default period). The fast and slow constants are settings, fast_period and slow_period (TA-Lib fixes them at 2 and 30, these defaults). Defaults to a period of 10 (TA-Lib: 30). Adds slope, and efficiency_ratio (the window's net move over its total travel), which TA-Lib does not output. |
| `macd` | MACD | TA-Lib `MACD` | a convention | Seeds each average on the first bars of the series, so macd_line starts at bar slow_period - 1. TA-Lib seeds the fast average on the bars that end where the slow average's seed ends, and publishes every output only from the signal line's first bar (slow_period + signal_period - 2). The values differ at the start and converge as the averages forget their seeds (on the fixture's bars, by bar 180 at 12, 26 and 9). Adds macd_line_slope, signal_line_slope and histogram_slope, which TA-Lib does not compute. |
| `rsi` | RSI | TA-Lib `RSI` | matches | A first window with no gain and no loss reads 50 (TA-Lib reads 0). The smoothed averages never return to exactly zero once either has moved, so only a series that opens flat meets it. Adds slope, and average_win and average_loss (the smoothed averages TA-Lib keeps inside), which TA-Lib does not output. |
| `stoch` | Stochastic | TA-Lib `STOCH and STOCHF` | a convention | A window whose highest high equals its lowest low (no range) has no %K, so the averages over it have none either; TA-Lib writes 0 there. Publishes percent_k from its own first bar; TA-Lib publishes slow %K only from %D's first bar. The Slow type always slows %K by 3 bars, Full slows it by k_slow_period, and Fast is TA-Lib's STOCHF (no slowing). Defaults to 14, 3 and 3 (TA-Lib: 5, 3 and 3). Adds percent_j (3 times %K less 2 times %D), raw_k (the unslowed %K) and slope, which TA-Lib does not compute. |
| `willr` | Williams Percent Range (%R) | TA-Lib `WILLR` | a convention | A window whose highest high equals its lowest low (no range) has no value; TA-Lib writes 0 there. Adds slope, each bar's change in the value, which TA-Lib does not compute. |
| `cci` | Commodity Channel Index (CCI) | TA-Lib `CCI` | matches | Defaults to 20 bars (TA-Lib's CCI: 14). The constant is a setting (TA-Lib fixes it at 0.015, this default). Reads the typical price, as TA-Lib does, and 0 where the mean deviation is zero. Adds slope, and mean_deviation, which TA-Lib does not output. |
| `ppo` | Percentage Price Oscillator (PPO) | TA-Lib `PPO` | matches | On exponential averages: TA-Lib's PPO with matype 1 (TA-Lib's default is simple averages). No value where the slow average is at or below 1e-9. Adds signal_line (an exponential average of the line over signal_period), histogram, and the three lines' slopes, which TA-Lib's PPO does not compute. |
| `cmo` | Chande Momentum Oscillator (CMO) | TA-Lib `CMO` | a convention | Sums the gains and the losses over the window, as Chande defined the oscillator; TA-Lib smooths them the way Wilder smooths the RSI's, so the values differ on every bar after the first. A window with no gain and no loss reads 0. Adds slope, and direction (1, -1 or 0), which TA-Lib does not compute. |
| `trix` | TRIX | TA-Lib `TRIX` | matches | Defaults to 15 bars (TA-Lib's TRIX: 30). Adds signal_line (an exponential average of TRIX over signal_period), histogram and slope, which TA-Lib does not compute. |
| `uo` | Ultimate Oscillator | TA-Lib `ULTOSC` | matches | Adds slope, and buying_pressure and true_range (each bar's inputs to the averages), which TA-Lib does not output. |
| `adx` | ADX / DMI | TA-Lib `ADX, PLUS_DI, MINUS_DI and DX` | a convention | Seeds the smoothed directional movement and true range with their sums over the first period bars; TA-Lib sums the first period - 1 and takes one smoothing step. The values differ at the start and converge as the smoothing forgets its seed (on the fixture's bars, by bar 280 at a period of 14). smoothing_method is accepted and does not change the numbers: the smoothing is always Wilder's, as TA-Lib's. Adds adxr (over adxr_lookback bars, none at its default of 0), di_diff and di_ratio, which these TA-Lib functions do not compute. |
| `aroon` | Aroon | TA-Lib `AROON and AROONOSC` | a convention | Looks back over the last period bars, today included, and starts at bar period - 1; TA-Lib looks back over period + 1 bars and starts at bar period. The values differ throughout. Adds direction (1 where Aroon Up is above Aroon Down, else -1), which TA-Lib does not compute. |
| `psar` | Parabolic SAR (PSAR) | TA-Lib `SAR` | a convention | Starts long, from the first bar's low with the first bar's high as its extreme point; TA-Lib chooses the first trend from the first two bars' directional movement. On a reversal it moves the stop to the extreme point; TA-Lib also keeps it beyond the reversal bar's and the bar before's range. The two agree for long stretches and part where those rules apply. increment is a setting of its own (TA-Lib's SAR steps by its starting acceleration). Adds direction, is_flipped, acceleration_factor and extreme_point, which TA-Lib does not output. |
| `atr` | ATR | TA-Lib `ATR` | a convention | Starts at bar period - 1 with the average true range of bars 0 to period - 1, bar 0's being its high less its low; TA-Lib starts at bar period with the average of bars 1 to period (bar 0 has no previous close). The values differ at the start and converge as the smoothing forgets its seed. The output is named atr. Adds slope, each bar's change in the value, which TA-Lib does not compute. |
| `bbands` | Bollinger Bands | TA-Lib `BBANDS` | matches | Defaults to 20 bars and 2 deviations (TA-Lib's BBANDS: 5, 2 and 2); one multiplier sets both bands. The deviation is the population one (dividing by n), as TA-Lib's. Adds width, percent_b (in percent: 0 at the lower band, 100 at the upper; none where the bands meet), deviation (the value less the middle band) and slope, which TA-Lib does not compute. |
| `ad` | Accumulation/Distribution (A/D) | TA-Lib `AD` | matches | Adds smoothed_value (an exponential average of the line over smoothing_period), slope and raw_money_flow (each bar's addition), which TA-Lib does not compute. |
| `adosc` | Chaikin Oscillator | TA-Lib `ADOSC` | a convention | Seeds each exponential average of the A/D line with the simple average of its first period values; TA-Lib seeds both with the first A/D value. The values differ at the start and converge as the averages forget their seeds. Adds slope, and direction (1, -1 or 0), which TA-Lib does not compute. |
| `mfi` | Money Flow Index (MFI) | TA-Lib `MFI` | a convention | A window with no money flow either way (no volume, or a flat typical price) reads 50; TA-Lib writes 0. money_flow_ratio: the strategy node writes an infinity where the window had buying and no selling; the package writes null there, since it never returns a number that is not finite. Adds slope and money_flow_ratio, which TA-Lib does not output. |
| `obv` | On-Balance Volume (OBV) | TA-Lib `OBV` | a convention | Starts at 0 on the first bar; TA-Lib starts at the first bar's volume, so every value differs from TA-Lib's by that one volume. Adds smoothed_value (an exponential average over smoothing_period) and slope, which TA-Lib does not compute. |
| `linreg` | Linear Regression | TA-Lib `LINEARREG and LINEARREG_SLOPE` | matches | value is TA-Lib's LINEARREG and slope its LINEARREG_SLOPE. Near zero the slope agrees within 1e-11 absolute rather than the default 1e-12, because the two sum the window in opposite orders (the catalog's oracle note). Adds r_squared (the fit's R-squared, in percent) and change (the line's move since the prior bar), which TA-Lib does not compute. |

## The indicators

Each links to its page in AlgoLift's guide where one is published (the indicators the platform also runs as strategy nodes), and to the guide's indicator reference otherwise.

### Moving averages (27)

| Function | Indicator | Source | Verified against | Guide |
|---|---|---|---|---|
| `wma` | Weighted Moving Average (WMA) | TA-Lib `ta_WMA.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators/wma) |
| `trima` | Triangular Moving Average (TRIMA) | TA-Lib `ta_TRIMA.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `rma` | Wilder's Moving Average (RMA) | pandas-ta-classic `pandas_ta_classic/overlap/rma.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators/rma) |
| `vwma` | Volume Weighted Moving Average (VWMA) | pandas-ta-classic `pandas_ta_classic/overlap/vwma.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators/vwma) |
| `zlma` | Zero-Lag Moving Average (ZLMA) | pandas-ta-classic `pandas_ta_classic/overlap/zlma.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators/zlma) |
| `alma` | Arnaud Legoux Moving Average (ALMA) | pandas-ta `pandas_ta/overlap/alma.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators/alma) |
| `t3` | T3 Moving Average (Tillson) | TA-Lib `ta_T3.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `mcgd` | McGinley Dynamic | pandas-ta-classic `pandas_ta_classic/overlap/mcgd.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators/mcgd) |
| `vidya` | Variable Index Dynamic Average (VIDYA) | pandas-ta-classic `pandas_ta_classic/overlap/vidya.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `hwma` | Holt-Winters Moving Average (HWMA) | pandas-ta-classic `pandas_ta_classic/overlap/hwma.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `fwma` | Fibonacci Weighted Moving Average (FWMA) | pandas-ta-classic `pandas_ta_classic/overlap/fwma.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `pwma` | Pascal's Weighted Moving Average (PWMA) | pandas-ta-classic `pandas_ta_classic/overlap/pwma.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `sinwma` | Sine Weighted Moving Average (SINWMA) | pandas-ta-classic `pandas_ta_classic/overlap/sinwma.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `swma` | Symmetric Weighted Moving Average (SWMA) | pandas-ta-classic `pandas_ta_classic/overlap/swma.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `ssf` | Super Smoother Filter (2-pole) | pandas-ta-classic `pandas_ta_classic/overlap/ssf.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `ssf3` | Super Smoother Filter (3-pole) | pandas-ta `pandas_ta/overlap/ssf3.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators) |
| `mama` | MESA Adaptive Moving Average (MAMA) | TA-Lib `ta_MAMA.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `htTrendline` | Hilbert Transform Instantaneous Trendline | TA-Lib `ta_HT_TRENDLINE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `hilo` | Gann HiLo Activator | pandas-ta-classic `pandas_ta_classic/overlap/hilo.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `alligator` | Alligator | pandas-ta `pandas_ta/overlap/alligator.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators) |
| `mmar` | Moving Average Ribbon (Madrid) | pandas-ta-classic `pandas_ta_classic/overlap/mmar.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `rainbow` | Rainbow Moving Averages | pandas-ta-classic `pandas_ta_classic/overlap/rainbow.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `sma` | SMA | AlgoLift | TA-Lib `SMA` (matches) | [guide](https://algolift.ai/guide/reference/indicators/sma) |
| `ema` | EMA | AlgoLift | TA-Lib `EMA` (matches) | [guide](https://algolift.ai/guide/reference/indicators/ema) |
| `dema` | DEMA (Double EMA) | AlgoLift | TA-Lib `DEMA` (matches) | [guide](https://algolift.ai/guide/reference/indicators/dema) |
| `tema` | TEMA (Triple EMA) | AlgoLift | TA-Lib `TEMA` (matches) | [guide](https://algolift.ai/guide/reference/indicators/tema) |
| `kama` | Kaufman's Adaptive MA (KAMA) | AlgoLift | its own numbers (differs from TA-Lib `KAMA` by a [convention](#the-classic-indicators)) | [guide](https://algolift.ai/guide/reference/indicators/kama) |

### Price transforms (8)

| Function | Indicator | Source | Verified against | Guide |
|---|---|---|---|---|
| `hl2` | Median Price (HL2) | TA-Lib `ta_MEDPRICE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `hlc3` | Typical Price (HLC3) | TA-Lib `ta_TYPPRICE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `ohlc4` | OHLC Average | TA-Lib `ta_AVGPRICE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `wcp` | Weighted Close Price | TA-Lib `ta_WCLPRICE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `midpoint` | Midpoint over Period | TA-Lib `ta_MIDPOINT.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `midprice` | Midpoint Price over Period | TA-Lib `ta_MIDPRICE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `heikinAshi` | Heikin-Ashi Candles | pandas-ta-classic `pandas_ta_classic/candles/ha.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlZ` | Z-Score Candles | pandas-ta-classic `pandas_ta_classic/candles/cdl_z.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |

### Momentum (40)

| Function | Indicator | Source | Verified against | Guide |
|---|---|---|---|---|
| `mom` | Momentum | TA-Lib `ta_MOM.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators/mom) |
| `roc` | Rate of Change (ROC) | TA-Lib `ta_ROC.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators/roc) |
| `apo` | Absolute Price Oscillator (APO) | TA-Lib `ta_APO.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `ao` | Awesome Oscillator (AO) | pandas-ta-classic `pandas_ta_classic/momentum/ao.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators/ao) |
| `bop` | Balance of Power (BOP) | TA-Lib `ta_BOP.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `bias` | Bias | pandas-ta-classic `pandas_ta_classic/momentum/bias.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `brar` | BRAR | pandas-ta-classic `pandas_ta_classic/momentum/brar.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cfo` | Chande Forecast Oscillator (CFO) | pandas-ta-classic `pandas_ta_classic/momentum/cfo.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `crsi` | Connors RSI | pandas-ta `pandas_ta/momentum/crsi.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators/crsi) |
| `coppock` | Coppock Curve | pandas-ta-classic `pandas_ta_classic/momentum/coppock.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cti` | Correlation Trend Indicator (CTI) | pandas-ta-classic `pandas_ta_classic/momentum/cti.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `dm` | Directional Movement (+DM, -DM) | TA-Lib `ta_PLUS_DM.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `er` | Efficiency Ratio (ER) | pandas-ta-classic `pandas_ta_classic/momentum/er.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `eri` | Elder Ray (Bull and Bear Power) | pandas-ta-classic `pandas_ta_classic/momentum/eri.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `exhc` | Exhaustion Count | pandas-ta `pandas_ta/momentum/exhc.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators) |
| `inertia` | Inertia | pandas-ta-classic `pandas_ta_classic/momentum/inertia.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `kdj` | KDJ | pandas-ta-classic `pandas_ta_classic/momentum/kdj.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `kst` | Know Sure Thing (KST) | pandas-ta-classic `pandas_ta_classic/momentum/kst.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `lrsi` | Laguerre RSI | pandas-ta-classic `pandas_ta_classic/momentum/lrsi.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `pgo` | Pretty Good Oscillator (PGO) | pandas-ta-classic `pandas_ta_classic/momentum/pgo.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `po` | Projection Oscillator | pandas-ta-classic `pandas_ta_classic/momentum/po.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `psl` | Psychological Line (PSL) | pandas-ta-classic `pandas_ta_classic/momentum/psl.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `rvgi` | Relative Vigor Index (RVGI) | pandas-ta-classic `pandas_ta_classic/momentum/rvgi.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `stc` | Schaff Trend Cycle (STC) | pandas-ta-classic `pandas_ta_classic/momentum/stc.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators/stc) |
| `seqCount` | Sequential Setup Count | pandas-ta-classic `pandas_ta_classic/momentum/td_seq.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `slope` | Slope | pandas-ta-classic `pandas_ta_classic/momentum/slope.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `smi` | SMI Ergodic | pandas-ta-classic `pandas_ta_classic/momentum/smi.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `squeeze` | Squeeze Momentum | pandas-ta-classic `pandas_ta_classic/momentum/squeeze.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators/squeeze) |
| `squeezePro` | Squeeze Pro | pandas-ta-classic `pandas_ta_classic/momentum/squeeze_pro.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `tmo` | True Momentum Oscillator (TMO) | pandas-ta `pandas_ta/momentum/tmo.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators) |
| `vwmacd` | Volume-Weighted MACD (VWMACD) | pandas-ta-classic `pandas_ta_classic/momentum/vwmacd.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `macd` | MACD | AlgoLift | its own numbers (differs from TA-Lib `MACD` by a [convention](#the-classic-indicators)) | [guide](https://algolift.ai/guide/reference/indicators/macd) |
| `rsi` | RSI | AlgoLift | TA-Lib `RSI` (matches) | [guide](https://algolift.ai/guide/reference/indicators/rsi) |
| `stoch` | Stochastic | AlgoLift | its own numbers (differs from TA-Lib `STOCH and STOCHF` by a [convention](#the-classic-indicators)) | [guide](https://algolift.ai/guide/reference/indicators) |
| `willr` | Williams Percent Range (%R) | AlgoLift | its own numbers (differs from TA-Lib `WILLR` by a [convention](#the-classic-indicators)) | [guide](https://algolift.ai/guide/reference/indicators) |
| `cci` | Commodity Channel Index (CCI) | AlgoLift | TA-Lib `CCI` (matches) | [guide](https://algolift.ai/guide/reference/indicators/cci) |
| `ppo` | Percentage Price Oscillator (PPO) | AlgoLift | TA-Lib `PPO` (matches) | [guide](https://algolift.ai/guide/reference/indicators/ppo) |
| `cmo` | Chande Momentum Oscillator (CMO) | AlgoLift | its own numbers (differs from TA-Lib `CMO` by a [convention](#the-classic-indicators)) | [guide](https://algolift.ai/guide/reference/indicators/cmo) |
| `trix` | TRIX | AlgoLift | TA-Lib `TRIX` (matches) | [guide](https://algolift.ai/guide/reference/indicators/trix) |
| `uo` | Ultimate Oscillator | AlgoLift | TA-Lib `ULTOSC` (matches) | [guide](https://algolift.ai/guide/reference/indicators) |

### Trend strength (16)

| Function | Indicator | Source | Verified against | Guide |
|---|---|---|---|---|
| `adxr` | ADX Rating (ADXR) | TA-Lib `ta_ADXR.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `chop` | Choppiness Index (CHOP) | pandas-ta-classic `pandas_ta_classic/trend/chop.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators/chop) |
| `vhf` | Vertical Horizontal Filter (VHF) | pandas-ta-classic `pandas_ta_classic/trend/vhf.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `rwi` | Random Walk Index (RWI) | pandas-ta `pandas_ta/trend/rwi.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators) |
| `amat` | Archer Moving Averages Trends (AMAT) | pandas-ta-classic `pandas_ta_classic/trend/amat.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `trendBars` | Trend Bars (six-bar trend) | pandas-ta-classic `pandas_ta_classic/trend/ttm_trend.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `htTrendmode` | Hilbert Transform Trend vs Cycle Mode | TA-Lib `ta_HT_TRENDMODE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `qstick` | QStick | pandas-ta-classic `pandas_ta_classic/trend/qstick.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `dpo` | Detrended Price Oscillator (DPO) | pandas-ta-classic `pandas_ta_classic/trend/dpo.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `alphatrend` | AlphaTrend | pandas-ta `pandas_ta/trend/alphatrend.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators) |
| `pmax` | PMax (profit maximizer) | pandas-ta-classic `pandas_ta_classic/trend/pmax.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cksp` | Chande Kroll Stop (CKSP) | pandas-ta-classic `pandas_ta_classic/trend/cksp.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `decay` | Decay (linear or exponential) | pandas-ta-classic `pandas_ta_classic/trend/decay.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `adx` | ADX / DMI | AlgoLift | its own numbers (differs from TA-Lib `ADX, PLUS_DI, MINUS_DI and DX` by a [convention](#the-classic-indicators)) | [guide](https://algolift.ai/guide/reference/indicators) |
| `aroon` | Aroon | AlgoLift | its own numbers (differs from TA-Lib `AROON and AROONOSC` by a [convention](#the-classic-indicators)) | [guide](https://algolift.ai/guide/reference/indicators/aroon) |
| `psar` | Parabolic SAR (PSAR) | AlgoLift | its own numbers (differs from TA-Lib `SAR` by a [convention](#the-classic-indicators)) | [guide](https://algolift.ai/guide/reference/indicators) |

### Volatility (14)

| Function | Indicator | Source | Verified against | Guide |
|---|---|---|---|---|
| `natr` | Normalized ATR (NATR) | TA-Lib `ta_NATR.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators/natr) |
| `trueRange` | True Range | TA-Lib `ta_TRANGE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `hvol` | Historical Volatility (annualised) | pandas-ta-classic `pandas_ta_classic/volatility/hvol.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `ui` | Ulcer Index (UI) | pandas-ta-classic `pandas_ta_classic/volatility/ui.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `rvi` | Relative Volatility Index (RVI) | pandas-ta-classic `pandas_ta_classic/volatility/rvi.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `massi` | Mass Index | pandas-ta-classic `pandas_ta_classic/volatility/massi.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `thermo` | Elder Market Thermometer | pandas-ta-classic `pandas_ta_classic/volatility/thermo.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `pdist` | Price Distance | pandas-ta-classic `pandas_ta_classic/volatility/pdist.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `chandelier` | Chandelier Exit | pandas-ta-classic `pandas_ta_classic/volatility/ce.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators/chandelier) |
| `atrStop` | ATR Trailing Stop | pandas-ta `pandas_ta/volatility/atrts.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators) |
| `aberration` | Aberration | pandas-ta-classic `pandas_ta_classic/volatility/aberration.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `accbands` | Acceleration Bands | pandas-ta-classic `pandas_ta_classic/volatility/accbands.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `hwc` | Holt-Winters Channel | pandas-ta-classic `pandas_ta_classic/volatility/hwc.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `atr` | ATR | AlgoLift | its own numbers (differs from TA-Lib `ATR` by a [convention](#the-classic-indicators)) | [guide](https://algolift.ai/guide/reference/indicators/atr) |

### Bands and channels (1)

| Function | Indicator | Source | Verified against | Guide |
|---|---|---|---|---|
| `bbands` | Bollinger Bands | AlgoLift | TA-Lib `BBANDS` (matches) | [guide](https://algolift.ai/guide/reference/indicators) |

### Volume (17)

| Function | Indicator | Source | Verified against | Guide |
|---|---|---|---|---|
| `aobv` | Archer On-Balance Volume (AOBV) | pandas-ta-classic `pandas_ta_classic/volume/aobv.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `pvt` | Price Volume Trend (PVT) | pandas-ta-classic `pandas_ta_classic/volume/pvt.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `pvol` | Price-Volume (PVOL) | pandas-ta-classic `pandas_ta_classic/volume/pvol.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `pvr` | Price Volume Rank (PVR) | pandas-ta-classic `pandas_ta_classic/volume/pvr.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `nvi` | Negative Volume Index (NVI) | pandas-ta-classic `pandas_ta_classic/volume/nvi.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `pvi` | Positive Volume Index (PVI) | pandas-ta-classic `pandas_ta_classic/volume/pvi.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `pvo` | Percentage Volume Oscillator (PVO) | pandas-ta-classic `pandas_ta_classic/momentum/pvo.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `vosc` | Volume Oscillator | pandas-ta-classic `pandas_ta_classic/volume/vosc.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `kvo` | Klinger Volume Oscillator (KVO) | pandas-ta-classic `pandas_ta_classic/volume/kvo.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `eom` | Ease of Movement (EOM) | pandas-ta-classic `pandas_ta_classic/volume/eom.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `marketfi` | Market Facilitation Index | pandas-ta-classic `pandas_ta_classic/volume/marketfi.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `tsv` | Time Segmented Volume (TSV) | pandas-ta `pandas_ta/volume/tsv.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators) |
| `wad` | Williams Accumulation/Distribution (WAD) | pandas-ta-classic `pandas_ta_classic/volume/wad.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `ad` | Accumulation/Distribution (A/D) | AlgoLift | TA-Lib `AD` (matches) | [guide](https://algolift.ai/guide/reference/indicators) |
| `adosc` | Chaikin Oscillator | AlgoLift | its own numbers (differs from TA-Lib `ADOSC` by a [convention](#the-classic-indicators)) | [guide](https://algolift.ai/guide/reference/indicators) |
| `mfi` | Money Flow Index (MFI) | AlgoLift | its own numbers (differs from TA-Lib `MFI` by a [convention](#the-classic-indicators)) | [guide](https://algolift.ai/guide/reference/indicators/mfi) |
| `obv` | On-Balance Volume (OBV) | AlgoLift | its own numbers (differs from TA-Lib `OBV` by a [convention](#the-classic-indicators)) | [guide](https://algolift.ai/guide/reference/indicators/obv) |

### Cycles (9)

| Function | Indicator | Source | Verified against | Guide |
|---|---|---|---|---|
| `cg` | Center of Gravity (Ehlers) | pandas-ta-classic `pandas_ta_classic/momentum/cg.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `dsp` | Detrended Synthetic Price | pandas-ta-classic `pandas_ta_classic/cycles/dsp.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `ebsw` | Even Better Sinewave (Ehlers) | pandas-ta-classic `pandas_ta_classic/cycles/ebsw.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `htDcperiod` | Hilbert Transform Dominant Cycle Period | TA-Lib `ta_HT_DCPERIOD.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `htDcphase` | Hilbert Transform Dominant Cycle Phase | TA-Lib `ta_HT_DCPHASE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `htPhasor` | Hilbert Transform Phasor (in-phase, quadrature) | TA-Lib `ta_HT_PHASOR.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `htSine` | Hilbert Transform Sine Wave | TA-Lib `ta_HT_SINE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `reflex` | Reflex (Ehlers) | pandas-ta `pandas_ta/cycle/reflex.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators) |
| `trendflex` | Trendflex (Ehlers) | pandas-ta `pandas_ta/trend/trendflex.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators) |

### Statistics (15)

| Function | Indicator | Source | Verified against | Guide |
|---|---|---|---|---|
| `stdev` | Standard Deviation | TA-Lib `ta_STDDEV.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `variance` | Variance | TA-Lib `ta_VAR.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `mad` | Mean Absolute Deviation (MAD) | pandas-ta-classic `pandas_ta_classic/statistics/mad.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `stderr` | Standard Error | pandas-ta-classic `pandas_ta_classic/statistics/stderr.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `zscore` | Z-Score | pandas-ta-classic `pandas_ta_classic/statistics/zscore.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators/zscore) |
| `median` | Rolling Median | pandas-ta-classic `pandas_ta_classic/statistics/median.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `quantile` | Rolling Quantile | pandas-ta-classic `pandas_ta_classic/statistics/quantile.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `stdevChannel` | Standard Deviation Channel (all bars) | pandas-ta-classic `pandas_ta_classic/statistics/tos_stdevall.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `skew` | Skewness | pandas-ta-classic `pandas_ta_classic/statistics/skew.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `kurtosis` | Kurtosis | pandas-ta-classic `pandas_ta_classic/statistics/kurtosis.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `entropy` | Entropy | pandas-ta-classic `pandas_ta_classic/statistics/entropy.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `correl` | Correlation | TA-Lib `ta_CORREL.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `beta` | Beta | TA-Lib `ta_BETA.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `logReturn` | Log Return | pandas-ta-classic `pandas_ta_classic/performance/log_return.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `drawdown` | Drawdown from High | pandas-ta-classic `pandas_ta_classic/performance/drawdown.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |

### Regression (4)

| Function | Indicator | Source | Verified against | Guide |
|---|---|---|---|---|
| `linregIntercept` | Linear Regression Intercept | TA-Lib `ta_LINEARREG_INTERCEPT.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `tsf` | Time Series Forecast | TA-Lib `ta_TSF.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `linregAngle` | Linear Regression Angle | TA-Lib `ta_LINEARREG_ANGLE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `linreg` | Linear Regression | AlgoLift | TA-Lib `LINEARREG and LINEARREG_SLOPE` (matches) | [guide](https://algolift.ai/guide/reference/indicators) |

### Market structure (3)

| Function | Indicator | Source | Verified against | Guide |
|---|---|---|---|---|
| `zigzag` | ZigZag | pandas-ta `pandas_ta/trend/zigzag.py` | pandas-ta 0.4.71b0 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cpr` | Central Pivot Range (CPR) | pandas-ta-classic `pandas_ta_classic/trend/cpr.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators) |
| `smcSweep` | Liquidity Sweep | pandas-ta-classic `pandas_ta_classic/momentum/smc_sweep.py` | pandas-ta-classic 0.8.32 | [guide](https://algolift.ai/guide/reference/indicators/smc-sweep) |

### Candlestick patterns (63)

| Function | Indicator | Source | Verified against | Guide |
|---|---|---|---|---|
| `cdlDoji` | Doji | TA-Lib `ta_CDLDOJI.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlDragonflydoji` | Dragonfly Doji | TA-Lib `ta_CDLDRAGONFLYDOJI.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlGravestonedoji` | Gravestone Doji | TA-Lib `ta_CDLGRAVESTONEDOJI.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlSpinningtop` | Spinning Top | TA-Lib `ta_CDLSPINNINGTOP.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlMarubozu` | Marubozu | TA-Lib `ta_CDLMARUBOZU.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlHammer` | Hammer | TA-Lib `ta_CDLHAMMER.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlShootingstar` | Shooting Star | TA-Lib `ta_CDLSHOOTINGSTAR.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlEngulfing` | Engulfing | TA-Lib `ta_CDLENGULFING.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlMorningstar` | Morning Star | TA-Lib `ta_CDLMORNINGSTAR.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlEveningstar` | Evening Star | TA-Lib `ta_CDLEVENINGSTAR.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlHighwave` | High-Wave Candle | TA-Lib `ta_CDLHIGHWAVE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlLongleggeddoji` | Long Legged Doji | TA-Lib `ta_CDLLONGLEGGEDDOJI.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlLongline` | Long Line Candle | TA-Lib `ta_CDLLONGLINE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlShortline` | Short Line Candle | TA-Lib `ta_CDLSHORTLINE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlBelthold` | Belt-hold | TA-Lib `ta_CDLBELTHOLD.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlClosingmarubozu` | Closing Marubozu | TA-Lib `ta_CDLCLOSINGMARUBOZU.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlTakuri` | Takuri | TA-Lib `ta_CDLTAKURI.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlRickshawman` | Rickshaw Man | TA-Lib `ta_CDLRICKSHAWMAN.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlInvertedhammer` | Inverted Hammer | TA-Lib `ta_CDLINVERTEDHAMMER.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlHangingman` | Hanging Man | TA-Lib `ta_CDLHANGINGMAN.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlDojistar` | Doji Star | TA-Lib `ta_CDLDOJISTAR.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlTristar` | Tristar Pattern | TA-Lib `ta_CDLTRISTAR.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlMorningdojistar` | Morning Doji Star | TA-Lib `ta_CDLMORNINGDOJISTAR.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlEveningdojistar` | Evening Doji Star | TA-Lib `ta_CDLEVENINGDOJISTAR.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlAbandonedbaby` | Abandoned Baby | TA-Lib `ta_CDLABANDONEDBABY.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlLadderbottom` | Ladder Bottom | TA-Lib `ta_CDLLADDERBOTTOM.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlConcealbabyswall` | Concealing Baby Swallow | TA-Lib `ta_CDLCONCEALBABYSWALL.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdl3linestrike` | Three-Line Strike | TA-Lib `ta_CDL3LINESTRIKE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlTweezerBottom` | Tweezer Bottom | technicalindicators `lib/candlestick/TweezerBottom.js` | an independent numpy implementation of the library's rule | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlTweezerTop` | Tweezer Top | technicalindicators `lib/candlestick/TweezerTop.js` | an independent numpy implementation of the library's rule | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlHarami` | Harami | TA-Lib `ta_CDLHARAMI.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlHaramicross` | Harami Cross | TA-Lib `ta_CDLHARAMICROSS.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdl3inside` | Three Inside | TA-Lib `ta_CDL3INSIDE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdl3outside` | Three Outside | TA-Lib `ta_CDL3OUTSIDE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlHomingpigeon` | Homing Pigeon | TA-Lib `ta_CDLHOMINGPIGEON.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlKicking` | Kicking | TA-Lib `ta_CDLKICKING.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlKickingbylength` | Kicking by Length | TA-Lib `ta_CDLKICKINGBYLENGTH.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlCounterattack` | Counterattack | TA-Lib `ta_CDLCOUNTERATTACK.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlInneck` | In-Neck | TA-Lib `ta_CDLINNECK.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlOnneck` | On-Neck | TA-Lib `ta_CDLONNECK.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlThrusting` | Thrusting | TA-Lib `ta_CDLTHRUSTING.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlPiercing` | Piercing | TA-Lib `ta_CDLPIERCING.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlDarkcloudcover` | Dark Cloud Cover | TA-Lib `ta_CDLDARKCLOUDCOVER.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlMatchinglow` | Matching Low | TA-Lib `ta_CDLMATCHINGLOW.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlSeparatinglines` | Separating Lines | TA-Lib `ta_CDLSEPARATINGLINES.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdl2crows` | Two Crows | TA-Lib `ta_CDL2CROWS.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlUpsidegap2crows` | Upside Gap Two Crows | TA-Lib `ta_CDLUPSIDEGAP2CROWS.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlUnique3river` | Unique 3 River | TA-Lib `ta_CDLUNIQUE3RIVER.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlGapsidesidewhite` | Side-by-Side White Lines | TA-Lib `ta_CDLGAPSIDESIDEWHITE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlSticksandwich` | Stick Sandwich | TA-Lib `ta_CDLSTICKSANDWICH.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlTasukigap` | Tasuki Gap | TA-Lib `ta_CDLTASUKIGAP.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlXsidegap3methods` | Gap Three Methods | TA-Lib `ta_CDLXSIDEGAP3METHODS.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlBreakaway` | Breakaway | TA-Lib `ta_CDLBREAKAWAY.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlRisefall3methods` | Three Methods | TA-Lib `ta_CDLRISEFALL3METHODS.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlMathold` | Mat Hold | TA-Lib `ta_CDLMATHOLD.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdl3whitesoldiers` | Three Advancing White Soldiers | TA-Lib `ta_CDL3WHITESOLDIERS.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlAdvanceblock` | Advance Block | TA-Lib `ta_CDLADVANCEBLOCK.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlStalledpattern` | Stalled Pattern | TA-Lib `ta_CDLSTALLEDPATTERN.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdl3blackcrows` | Three Black Crows | TA-Lib `ta_CDL3BLACKCROWS.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlIdentical3crows` | Identical Three Crows | TA-Lib `ta_CDLIDENTICAL3CROWS.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdl3starsinsouth` | Three Stars In The South | TA-Lib `ta_CDL3STARSINSOUTH.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlHikkake` | Hikkake Pattern | TA-Lib `ta_CDLHIKKAKE.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |
| `cdlHikkakemod` | Modified Hikkake Pattern | TA-Lib `ta_CDLHIKKAKEMOD.c` | TA-Lib 0.8.1 | [guide](https://algolift.ai/guide/reference/indicators) |

## Run the tests

```bash
npm install
npm test        # builds, runs every fixture against the package, type-checks the source and the published declarations
```

To regenerate or re-check the fixtures from the libraries themselves, see [oracle/README.md](oracle/README.md).

## License

MIT, copyright (c) 2026 AlgoLift LLC, see [LICENSE](LICENSE). The classics are AlgoLift's own; the other formulas are ports, so the original notices stay with them: TA-Lib's BSD-3-Clause license and the MIT licenses of pandas-ta-classic, pandas-ta and technicalindicators are in [NOTICE](NOTICE), exactly as each library states them.
