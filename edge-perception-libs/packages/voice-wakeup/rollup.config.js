import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

export default [
  {
    input: 'src/js/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
      }),
      copy({
        targets: [
          { src: 'pkg/*', dest: 'dist/pkg' },
        ],
      }),
    ],
    external: ['@edge-perception/common'],
  },
  {
    input: 'src/js/worker.ts',
    output: [
      {
        file: 'dist/edge-voice-wakeup-worker.js',
        format: 'iife',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
      }),
    ],
  },
];
