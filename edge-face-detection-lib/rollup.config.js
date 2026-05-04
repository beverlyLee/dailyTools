import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default [
  {
    input: 'src/js/index.ts',
    output: [
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
    ],
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist/types',
      }),
    ],
    external: [],
  },
  {
    input: 'src/js/worker.ts',
    output: [
      {
        file: 'dist/edge-face-detection-worker.js',
        format: 'iife',
        sourcemap: true,
        name: 'FaceDetectionWorker',
      },
      {
        file: 'dist/edge-face-detection-worker.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
    ],
  },
];
