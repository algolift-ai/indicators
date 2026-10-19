// packages/indicators/src/run.ts
//
// From what a caller holds to what a formula reads: bars or columns in, the
// settings checked against the catalog, the formula run, its outputs out.
// PURE.

import { CATALOG } from './catalog';
import { FORMULAS } from './formulas';
import type { IndicatorId } from './catalog';
import type { Bar, BarField, IndicatorInfo, Series } from './types';

/** Columns of bar values, oldest first, all the same length. A field an indicator does not read can be left out. */
export interface OhlcvColumns {
    open?: ArrayLike<number>;
    high?: ArrayLike<number>;
    low?: ArrayLike<number>;
    close?: ArrayLike<number>;
    volume?: ArrayLike<number>;
}

/** Bars (objects with open, high, low, close and volume), or columns of the same. Oldest first. */
export type OhlcvInput = readonly Bar[] | OhlcvColumns;

/** The settings an indicator takes, by name (each function's own options type says which). */
export type Options = { readonly [name: string]: number | string | undefined };

const FIELDS: readonly BarField[] = ['open', 'high', 'low', 'close', 'volume'];

const BY_ID: ReadonlyMap<string, IndicatorInfo> = new Map(CATALOG.map((info) => [info.id, info]));

/** The catalog entry for an id, or undefined. */
export function info(id: string): IndicatorInfo | undefined {
    return BY_ID.get(id);
}

/**
 * Bars from columns. A field the columns leave out throws a TypeError the
 * moment a formula reads it, naming the field, so a missing column is never
 * read as a number.
 */
export function toBars(input: OhlcvInput, who = 'the indicator'): Bar[] {
    if (Array.isArray(input)) return input as Bar[];
    const columns = input as OhlcvColumns;
    const present = FIELDS.filter((f) => columns[f] !== undefined && columns[f] !== null);
    if (present.length === 0) throw new TypeError('Pass bars, or columns of open, high, low, close and volume.');
    const n = columns[present[0]]!.length;
    for (const f of present) {
        if (columns[f]!.length !== n) throw new TypeError(`The ${f} column has ${columns[f]!.length} values; ${present[0]} has ${n}.`);
    }
    const missing: PropertyDescriptorMap = {};
    for (const f of FIELDS) {
        if (present.includes(f)) continue;
        missing[f] = {
            get() {
                throw new TypeError(`${who} reads ${f}, which the input does not have.`);
            },
        };
    }
    const proto = Object.create(Object.prototype, missing);
    const bars: Bar[] = new Array(n);
    for (let i = 0; i < n; i++) {
        const bar = Object.create(proto);
        for (const f of present) bar[f] = Number(columns[f]![i]);
        bars[i] = bar;
    }
    return bars;
}

/**
 * The settings a formula runs with: every parameter's default, then the
 * options given. An unknown option, a number that is not finite or is below
 * the parameter's minimum, and a choice that is not one of its options throw.
 */
export function settings(entry: IndicatorInfo, options: object = {}): Record<string, number | string> {
    const config: Record<string, number | string> = {};
    for (const p of entry.parameters) config[p.name] = p.default;
    for (const [name, value] of Object.entries(options) as [string, unknown][]) {
        if (value === undefined) continue;
        const p = entry.parameters.find((x) => x.name === name);
        if (!p) {
            const names = entry.parameters.map((x) => x.name);
            throw new TypeError(`${entry.fn} has no option "${name}"${names.length ? `; its options are ${names.join(', ')}` : '; it takes none'}.`);
        }
        if (p.type === 'number') {
            if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${entry.fn}: ${name} must be a finite number.`);
            if (p.min !== undefined && value < p.min) throw new RangeError(`${entry.fn}: ${name} is at least ${p.min}.`);
        } else if (!p.options.some((o) => o.value === value)) {
            throw new TypeError(`${entry.fn}: ${name} is one of ${p.options.map((o) => o.value).join(', ')}.`);
        }
        config[name] = value as number | string;
    }
    return config;
}

/** Every output of one indicator, by id: one value per bar, null where it has none. */
export function calculate(id: IndicatorId, input: OhlcvInput, options: Options | object = {}): Record<string, Series> {
    const entry = BY_ID.get(id);
    const formula = FORMULAS[id];
    if (!entry || !formula) throw new TypeError(`No indicator "${id}".`);
    const bars = toBars(input, entry.fn);
    const config = settings(entry, options);
    return formula.pattern ? { value: formula.compute(bars, config) } : formula.compute(bars, config);
}
