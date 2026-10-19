// test/dist.node.ts: the built files give the source's numbers, bit for bit (node:test).
// Runs after scripts/build.mjs, from the repo root.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { CATALOG, calculate } from '../src/index';
import { fixturePaths, loadBars } from './verify';

const root = process.cwd();
const bars = loadBars(fixturePaths(root).dir);

function same(a: Record<string, (number | null)[]>, b: Record<string, (number | null)[]>): boolean {
    return Object.keys(a).every((k) => a[k].length === b[k].length && a[k].every((v, i) => Object.is(v, b[k][i])));
}

test('dist/index.mjs and dist/index.cjs compute what the source computes', async () => {
    const esm = await import(pathToFileURL(path.join(root, 'dist', 'index.mjs')).href);
    const cjs = createRequire(path.join(root, 'package.json'))(path.join(root, 'dist', 'index.cjs'));
    assert.equal(esm.CATALOG.length, CATALOG.length);
    assert.equal(cjs.CATALOG.length, CATALOG.length);
    for (const info of CATALOG) {
        const want = calculate(info.id as never, bars);
        assert.ok(same(esm[info.fn](bars), want), `${info.id} (ESM)`);
        assert.ok(same(cjs[info.fn](bars), want), `${info.id} (CommonJS)`);
    }
});
