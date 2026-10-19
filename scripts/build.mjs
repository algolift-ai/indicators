// scripts/build.mjs: the npm build of @algolift/indicators.
//
//   dist/index.mjs            ES module, one file
//   dist/index.cjs            CommonJS, one file
//   dist/types/esm/*.d.mts    declarations for `import`
//   dist/types/cjs/*.d.cts    declarations for `require`
//
// esbuild bundles the source; tsc writes the declarations, which are copied
// into both trees with their relative imports spelled out (`./run` becomes
// `./run.mjs` or `./run.cjs`), as Node's resolution for TypeScript asks.

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });

const common = { entryPoints: [path.join(root, 'src', 'index.ts')], bundle: true, target: 'es2020', sourcemap: true, legalComments: 'none', logLevel: 'warning' };
await build({ ...common, format: 'esm', platform: 'neutral', outfile: path.join(dist, 'index.mjs') });
await build({ ...common, format: 'cjs', platform: 'node', outfile: path.join(dist, 'index.cjs') });

const tmp = path.join(dist, 'types', '.tsc');
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', path.join(root, 'tsconfig.json'), '--outDir', tmp], { stdio: 'inherit' });

/** Every declaration file under a folder. */
function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.d.ts') ? [path.join(dir, e.name)] : []));
}

for (const [tree, ext] of [['esm', 'mts'], ['cjs', 'cts']]) {
    for (const file of walk(tmp)) {
        const rel = path.relative(tmp, file);
        const text = fs.readFileSync(file, 'utf8').replace(/(from\s+|import\()(['"])(\.{1,2}\/[^'"]+)\2/g, (m, lead, q, spec) => {
            const base = path.resolve(path.dirname(file), spec);
            if (fs.existsSync(base + '.d.ts')) return `${lead}${q}${spec}.${ext.replace('t', 'j')}${q}`;
            if (fs.existsSync(path.join(base, 'index.d.ts'))) return `${lead}${q}${spec}/index.${ext.replace('t', 'j')}${q}`;
            throw new Error(`${rel}: cannot resolve ${spec}`);
        });
        const out = path.join(dist, 'types', tree, rel.replace(/\.d\.ts$/, `.d.${ext}`));
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, text);
    }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log('built dist/index.mjs, dist/index.cjs and the declarations');
