import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
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
