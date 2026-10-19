// packages/indicators/test/verify.ts
//
// THE ORACLE CHECKS, ONCE. Every indicator in the catalog against its
// fixture: the library's own output on the same 400 bars at three or more
// settings, written by oracle/generate.py. The checks hold:
//   · a null exactly where the library has none, a number where it has one;
//   · |ours - library| <= 1e-9 x |library| + 1e-12, unless the formula's
//     oracle terms loosen it with a written reason;
//   · the first case is the indicator's defaults;
//   · the candlestick patterns also match TA-Lib exactly on 8,000 stress bars
//     made to form every pattern.
// Framework-free: the test runners (jest in the app, node:test in the public
// repo) each turn these checks into tests.

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { CATALOG, FORMULAS, calculate } from '../src/index';
import type { Bar, IndicatorInfo, Series } from '../src/index';

export const RTOL = 1e-9;
export const ATOL = 1e-12;

export interface FixtureCase {
    settings: Record<string, number | string>;
    entry: string;
    call: Record<string, unknown>;
    inputs: string[];
    outputs: Record<string, Series>;
}

export interface Fixture {
    catalogueId: string;
    library: string;
    versions: Record<string, string>;
    generator: string;
    bars: { file: string; count: number; valuesSha256: string };
    note?: string;
    cases: FixtureCase[];
}

/** Where the fixtures are: `fixtures/` beside the package in the public repo, the app's own folder in the platform. */
export function fixturePaths(root: string): { dir: string; stress: string } {
    const own = path.join(root, 'fixtures');
    if (fs.existsSync(path.join(own, '_bars.json'))) return { dir: own, stress: path.join(own, 'candlestick_stress.json') };
    const app = path.resolve(root, '..', '..', 'src', 'lib', 'indicators', 'catalog');
    return { dir: path.join(app, '__fixtures__'), stress: path.join(app, 'candlestick_patterns', '__fixtures__', 'stress.json') };
}

const COLUMNS = ['open', 'high', 'low', 'close', 'volume'] as const;

/** The 400 fixed bars every fixture was computed on. */
export function loadBars(dir: string): Bar[] {
    const doc = JSON.parse(fs.readFileSync(path.join(dir, '_bars.json'), 'utf8'));
    return Array.from({ length: doc.count as number }, (_, i) => ({ open: doc.open[i], high: doc.high[i], low: doc.low[i], close: doc.close[i], volume: doc.volume[i] }));
}

/** The bars' hash as the oracle computes it: each column's float64 little-endian bytes, in order. */
export function barsSha256(bars: readonly Bar[]): string {
    const h = createHash('sha256');
    for (const c of COLUMNS) {
        const a = new Float64Array(bars.map((b) => b[c]));
        const buf = Buffer.from(a.buffer, a.byteOffset, a.byteLength);
        if (new Uint8Array(new Uint16Array([1]).buffer)[0] !== 1) buf.swap64();
        h.update(buf);
    }
    return h.digest('hex');
}

export function loadFixture(dir: string, id: string): Fixture | null {
    const file = path.join(dir, `${id}.json`);
    return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Fixture) : null;
}

/** The first bar where two series disagree beyond the terms, or null. */
export function firstMismatch(actual: readonly (number | null)[], expected: readonly (number | null)[], terms: { rtol: number; atol: number; skip: number }): string | null {
    if (actual.length !== expected.length) return `${actual.length} values for ${expected.length} bars`;
    for (let i = terms.skip; i < expected.length; i++) {
        const e = expected[i];
        const a = actual[i];
        if (e === null || a === null) {
            if (e !== a) return `bar ${i}: expected ${e}, got ${a}`;
            continue;
        }
        if (!(Math.abs(a - e) <= terms.rtol * Math.abs(e) + terms.atol)) return `bar ${i}: expected ${e}, got ${a}`;
    }
    return null;
}

function defaults(info: IndicatorInfo): Record<string, number | string> {
    return Object.fromEntries(info.parameters.map((p) => [p.name, p.default]));
}

function sameKeys(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
}

/** Every problem with one indicator against its fixture (an empty list when it matches). */
export function checkIndicator(info: IndicatorInfo, dir: string, bars: readonly Bar[], sha: string): string[] {
    const problems: string[] = [];
    const fixture = loadFixture(dir, info.id);
    if (!fixture) return [`no fixture ${info.id}.json`];
    if (fixture.catalogueId !== info.id) problems.push(`the fixture names ${fixture.catalogueId}`);
    if (fixture.bars.count !== bars.length || fixture.bars.valuesSha256 !== sha) problems.push('the fixture was computed on other bars');
    if (fixture.cases.length < 3) problems.push(`only ${fixture.cases.length} cases`);
    if (!sameKeys(fixture.cases[0].settings, defaults(info))) problems.push(`case 0 ${JSON.stringify(fixture.cases[0].settings)} is not the defaults ${JSON.stringify(defaults(info))}`);
    const names = new Set(info.parameters.map((p) => p.name));
    const outputs = new Set(info.outputs.map((o) => o.name));
    const t = FORMULAS[info.id as keyof typeof FORMULAS].oracle;
    fixture.cases.forEach((c, i) => {
        for (const k of Object.keys(c.settings)) if (!names.has(k)) problems.push(`case ${i} sets ${k}, which is not a setting`);
        const config = { ...defaults(info), ...c.settings };
        const out = calculate(info.id as never, bars, c.settings);
        const skip = typeof t?.skipLeading === 'function' ? t.skipLeading(config) : (t?.skipLeading ?? 0);
        const terms = { rtol: t?.rtol ?? RTOL, atol: t?.atol ?? ATOL, skip };
        for (const [name, expected] of Object.entries(c.outputs)) {
            if (!outputs.has(name)) problems.push(`case ${i}: the fixture's output ${name} is not an output`);
            const m = firstMismatch(out[name] ?? [], expected, terms);
            if (m) problems.push(`case ${i} ${JSON.stringify(c.settings)} ${name}: ${m}`);
        }
        for (const [name, series] of Object.entries(out)) {
            if (series.some((v) => v !== null && !Number.isFinite(v))) problems.push(`case ${i} ${name}: a value that is not a finite number`);
        }
    });
    // The same bars as columns give the same numbers, bit for bit.
    const columns = Object.fromEntries(COLUMNS.map((k) => [k, bars.map((b) => b[k])]));
    const asBars = calculate(info.id as never, bars, {});
    const asColumns = calculate(info.id as never, columns, {});
    for (const name of Object.keys(asBars)) {
        if (asBars[name].some((v, i) => !Object.is(v, asColumns[name][i]))) problems.push(`${name}: columns and bars disagree`);
    }
    return problems;
}

interface Stress {
    count: number;
    bars: { open: number[]; high: number[]; low: number[]; close: number[] };
    functions: Record<string, { settings: Record<string, number>; lookback: number; signals: Record<string, number> }[]>;
}

/** The TA-Lib function a pattern was ported from (`ta_CDLHAMMER.c` → CDLHAMMER), or null. */
export function talibPattern(info: IndicatorInfo): string | null {
    if (info.provenance.origin !== 'ported' || info.provenance.library !== 'TA-Lib') return null;
    const m = /^ta_(CDL[A-Z0-9]+)\.c$/.exec(info.provenance.entry);
    return m ? m[1] : null;
}

/** Every problem with one TA-Lib pattern on the stress bars (exact, no tolerance). */
export function checkStress(info: IndicatorInfo, stress: Stress): string[] {
    const func = talibPattern(info);
    if (!func) return [];
    const cases = stress.functions[func];
    if (!cases) return [`no stress output for ${func}`];
    const bars: Bar[] = stress.bars.close.map((close, i) => ({ open: stress.bars.open[i], high: stress.bars.high[i], low: stress.bars.low[i], close, volume: 0 }));
    const problems: string[] = [];
    for (const c of cases) {
        const want: (number | null)[] = new Array(stress.count).fill(0);
        for (let i = 0; i < Math.min(c.lookback, stress.count); i++) want[i] = null;
        for (const [k, v] of Object.entries(c.signals)) want[Number(k)] = v;
        const got = calculate(info.id as never, bars, c.settings).value;
        const first = want.findIndex((v, i) => v !== got[i]);
        if (first >= 0) problems.push(`stress ${JSON.stringify(c.settings)} bar ${first}: expected ${want[first]}, got ${got[first]}`);
    }
    return problems;
}

export function loadStress(file: string): Stress {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Stress;
}

/** Every check, one per indicator, for a test runner to wrap. */
export function checks(root: string): { name: string; run: () => string[] }[] {
    const { dir, stress: stressFile } = fixturePaths(root);
    const bars = loadBars(dir);
    const sha = barsSha256(bars);
    let stress: Stress | null = null;
    const getStress = () => (stress ??= loadStress(stressFile));
    return CATALOG.map((info) => ({
        name: `${info.fn} (${info.id}) against ${info.verifiedAgainst}`,
        run: () => [...checkIndicator(info, dir, bars, sha), ...(info.family === 'candlestick_patterns' ? checkStress(info, getStress()) : [])],
    }));
}

/** Fixtures in the folder that no indicator claims (the public repo holds only the catalog's). */
export function strayFixtures(root: string): string[] {
    const { dir } = fixturePaths(root);
    const ids = new Set(CATALOG.map((i) => i.id));
    return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json') && !f.startsWith('_') && f !== 'candlestick_stress.json')
        .map((f) => f.slice(0, -5))
        .filter((id) => !ids.has(id));
}
