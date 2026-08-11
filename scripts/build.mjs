import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'assets'), { recursive: true });

await build({
  entryPoints: [path.join(root, 'src/main.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome90'],
  outfile: path.join(dist, 'assets/main.js'),
  sourcemap: true,
  minify: false,
  legalComments: 'none'
});

await cp(path.join(root, 'public'), dist, { recursive: true });

