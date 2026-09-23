import { build } from 'esbuild';

await build({
  entryPoints: ['src/host-realtime.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  outfile: '../wwwroot/host-realtime.js',
});

console.log('Host realtime bundle built successfully.');
