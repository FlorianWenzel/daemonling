import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs', 'iife'],
    globalName: 'daemonling',
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
    target: 'es2020',
  },
  {
    entry: ['src/reveal.ts'],
    format: ['esm', 'cjs', 'iife'],
    globalName: 'RevealDaemonling',
    dts: true,
    sourcemap: true,
    clean: false,
    minify: false,
    target: 'es2020',
    footer: ({ format }) =>
      format === 'iife'
        ? { js: 'window.RevealDaemonling = RevealDaemonling.RevealDaemonling;' }
        : {},
  },
]);
