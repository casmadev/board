import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // Served from the site root during local dev, but under a repo subpath on
  // GitHub Pages (e.g. https://casmadev.github.io/board/demo/). The Pages
  // build sets VITE_BASE=/board/demo/; `npm run dev` leaves it unset → '/'.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@casmadev/board/styles.css': path.resolve(__dirname, '../../src/styles/casmaboard.css'),
      '@casmadev/board/locales': path.resolve(__dirname, '../../src/locales/index.ts'),
      '@casmadev/board': path.resolve(__dirname, '../../src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
