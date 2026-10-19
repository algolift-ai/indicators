// test/api.node.ts: the API's promises (node:test).

import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as lib from '../src/index';
import { CATALOG, FORMULAS, calculate, cdlEngulfing, hl2, wma } from '../src/index';

const bars = Array.from({ length: 60 }, (_, i) => {
    const close = 100 + Math.sin(i / 3) * 5 + i * 0.1;
    return { open: close - 0.5, high: close + 1, low: close - 1, close, volume: 1000 + i };
});

test('the catalog: unique ids, one exported function and one formula each', () => {
    const ids = new Set<string>();
    for (const info of CATALOG) {
        assert.ok(!ids.has(info.id), `${info.id} twice`);
        ids.add(info.id);
        assert.equal(typeof (lib as unknown as Record<string, unknown>)[info.fn], 'function', `${info.fn} is exported`);
        assert.ok(FORMULAS[info.id as keyof typeof FORMULAS], `${info.id} has a formula`);
        // A port, or a classic AlgoLift wrote and compared with TA-Lib.
        assert.ok(info.provenance.origin === 'ported' || (info.provenance.origin === 'algolift' && info.provenance.talib.library === 'TA-Lib'), info.id);
        assert.ok(info.outputs.length > 0);
    }
    assert.equal(Object.keys(FORMULAS).length, CATALOG.length);
});

test('one value per bar, the input untouched', () => {
    const before = JSON.stringify(bars);
    for (const info of CATALOG) {
        const out = calculate(info.id as never, bars);
        assert.deepEqual(Object.keys(out).sort(), info.outputs.map((o) => o.name).sort(), info.id);
        for (const series of Object.values(out)) assert.equal(series.length, bars.length, info.id);
    }
    assert.equal(JSON.stringify(bars), before);
});

test('defaults, then the options given', () => {
    assert.deepEqual(wma(bars), wma(bars, { period: 30, source: 'close' }));
    assert.notDeepEqual(wma(bars, { period: 5 }), wma(bars));
    assert.equal(wma(bars, { period: 5 }).value.findIndex((v) => v !== null), 4);
});

test('columns, typed arrays included, read as bars', () => {
    const columns = { open: bars.map((b) => b.open), high: Float64Array.from(bars.map((b) => b.high)), low: bars.map((b) => b.low), close: bars.map((b) => b.close), volume: bars.map((b) => b.volume) };
    assert.deepEqual(cdlEngulfing(columns), cdlEngulfing(bars));
    assert.deepEqual(wma({ close: columns.close }, { period: 7 }), wma(bars, { period: 7 }));
});

test('a column the indicator reads and the input lacks is named, never read as a number', () => {
    assert.throws(() => hl2({ close: bars.map((b) => b.close) }), /hl2 reads high/);
    assert.throws(() => wma({ open: [1, 2] }), /reads close/);
    assert.throws(() => wma({ close: [1, 2], high: [1] }), /The close column has 2 values; high has 1/);
});

test('an unknown option, a choice not offered and a number below its minimum throw', () => {
    assert.throws(() => wma(bars, { length: 3 } as never), /wma has no option "length"/);
    assert.throws(() => wma(bars, { source: 'vwap' } as never), /source is one of/);
    assert.throws(() => wma(bars, { period: 0 }), RangeError);
    assert.throws(() => wma(bars, { period: Number.NaN }), /finite number/);
});
