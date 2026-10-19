// scripts/test.mjs: `npm test`.
//
//   1. builds the package (scripts/build.mjs);
//   2. bundles each test/*.node.ts with esbuild and runs them with node:test:
//      every indicator against its oracle fixture, the API, and the built
//      files (ESM and CommonJS give the source's numbers);
//   3. type-checks the source and the tests, and a consumer of the built
//      declarations under Node's own resolution, from ESM and from CommonJS.

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (args) => execFileSync(process.execPath, args, { stdio: 'inherit', cwd: root });

run([path.join(root, 'scripts', 'build.mjs')]);

const out = path.join(root, '.test-build');
fs.rmSync(out, { recursive: true, force: true });
const tests = fs.readdirSync(path.join(root, 'test')).filter((f) => f.endsWith('.node.ts'));
for (const t of tests) {
    await build({
        entryPoints: [path.join(root, 'test', t)],
        bundle: true,
        platform: 'node',
        format: 'esm',
        target: 'node20',
        outfile: path.join(out, t.replace(/\.node\.ts$/, '.test.mjs')),
        logLevel: 'warning',
    });
}
run(['--test', ...tests.map((t) => path.join(out, t.replace(/\.node\.ts$/, '.test.mjs')))]);

const tsc = require.resolve('typescript/bin/tsc');
run([tsc, '-p', path.join(root, 'tsconfig.test.json')]);
run([tsc, '-p', path.join(root, 'test', 'consumer', 'tsconfig.json')]);
console.log('all checks passed');
