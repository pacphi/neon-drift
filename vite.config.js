import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { open: true },
  build: {
    // three.js is a single ~550 kB engine dependency the game needs up front, so
    // the bundle is legitimately above Vite's default 500 kB hint — lift the budget.
    chunkSizeWarningLimit: 700,
  },
});
