import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import copy from 'rollup-plugin-copy';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const external = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  'react/jsx-runtime',
];

const locales = ['en', 'es', 'fr', 'pt-BR', 'de', 'ja', 'ar', 'he'];

const tsPlugin = (declaration) =>
  typescript({
    tsconfig: './tsconfig.json',
    declaration,
    declarationMap: false,
    declarationDir: declaration ? './dist' : undefined,
    rootDir: './src',
    exclude: ['**/*.test.ts', '**/*.test.tsx', 'test/**'],
  });

const jsConfig = (input, outputDir, outputName, copyAssets = false) => ({
  input,
  external,
  output: [
    { file: `${outputDir}/${outputName}.mjs`, format: 'esm', sourcemap: true },
    { file: `${outputDir}/${outputName}.cjs`, format: 'cjs', sourcemap: true, exports: 'named' },
  ],
  plugins: [
    nodeResolve(),
    tsPlugin(false),
    ...(copyAssets
      ? [copy({ targets: [{ src: 'src/styles/casmaboard.css', dest: 'dist' }] })]
      : []),
  ],
});

const dtsConfig = (input, outputFile) => ({
  input,
  external,
  output: { file: outputFile, format: 'esm' },
  plugins: [dts()],
});

export default [
  jsConfig('src/index.ts', 'dist', 'index', true),
  dtsConfig('src/index.ts', 'dist/index.d.ts'),
  jsConfig('src/locales/index.ts', 'dist/locales', 'index'),
  dtsConfig('src/locales/index.ts', 'dist/locales/index.d.ts'),
  ...locales.flatMap((loc) => [
    jsConfig(`src/locales/${loc}.ts`, 'dist/locales', loc),
    dtsConfig(`src/locales/${loc}.ts`, `dist/locales/${loc}.d.ts`),
  ]),
];
