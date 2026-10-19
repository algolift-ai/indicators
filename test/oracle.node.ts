// test/oracle.node.ts: every indicator against its oracle fixture (node:test).
// The checks are in verify.ts; `npm test` bundles and runs this file.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checks, strayFixtures } from './verify';

const root = process.cwd();

for (const c of checks(root)) {
    test(c.name, () => {
        assert.deepEqual(c.run(), []);
    });
}

test('every fixture in fixtures/ belongs to an indicator', () => {
    assert.deepEqual(strayFixtures(root), []);
});
