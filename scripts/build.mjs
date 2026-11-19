import { build } from 'esbuild';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const output = join(process.cwd(), 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'main'), { recursive: true });
await mkdir(join(output, 'preload'), { recursive: true });
await mkdir(join(output, 'renderer'), { recursive: true });

await Promise.all([
  build({
    entryPoints: ['src/main/index.ts'],
    outfile: 'dist/main/index.cjs',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron'],
    sourcemap: false
  }),
  build({
    entryPoints: ['src/preload/index.ts'],
    outfile: 'dist/preload/index.cjs',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron']
  }),
  build({
    entryPoints: ['src/renderer/toolbar.ts', 'src/renderer/settings.ts'],
    outdir: 'dist/renderer',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'chrome120'
  })
]);

await Promise.all(['toolbar.html', 'toolbar.css', 'settings.html', 'settings.css'].map(
  file => copyFile(join('src', 'renderer', file), join(output, 'renderer', file))
));
